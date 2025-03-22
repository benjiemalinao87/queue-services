import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmailQueue, scheduledEmailQueue } from "./queues/email-queue";
import { myQueue } from "./queues/my-queue";
import { sendSMSQueue, scheduledSMSQueue } from "./queues/sms-queue";
import { env } from "./env";
import metricsRoutes from "./routes/metrics";
import { startBatchProcessing } from '@/utils/metrics';

// Get current file path and directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Add sample metrics data for testing the dashboard
 */
function addSampleMetricsData() {
  // Sample workspace IDs
  const workspaceIds = ['workspace-1', 'workspace-2', 'workspace-3', 'workspace-4', 'workspace-5'];
  
  // Add sample successful message processing
  workspaceIds.forEach((workspaceId, index) => {
    // Add successful SMS messages
    const smsCompleteBatch = startBatchProcessing('sms');
    const smsBatchSize = Math.floor(Math.random() * 20) + 5; // 5-25 messages
    smsCompleteBatch(smsBatchSize, true, false, workspaceId, '');
    
    // Add successful Email messages
    const emailCompleteBatch = startBatchProcessing('email');
    const emailBatchSize = Math.floor(Math.random() * 15) + 3; // 3-18 messages
    emailCompleteBatch(emailBatchSize, true, false, workspaceId, '');
    
    // Add some failed messages (not rate limited)
    if (index % 3 === 0) {
      const failedSmsCompleteBatch = startBatchProcessing('sms');
      failedSmsCompleteBatch(2, false, false, workspaceId, 'Invalid phone number');
      
      const failedEmailCompleteBatch = startBatchProcessing('email');
      failedEmailCompleteBatch(1, false, false, workspaceId, 'Invalid email address');
    }
  });
  
  // Add sample rate limit exceedances for some workspaces
  workspaceIds.slice(0, 3).forEach((workspaceId, index) => {
    // Add SMS rate limit exceedances
    const smsCompleteBatch = startBatchProcessing('sms');
    const smsBatchSize = Math.floor(Math.random() * 10) + 5; // 5-15 messages
    smsCompleteBatch(smsBatchSize, false, true, workspaceId, 'Rate limit exceeded for SMS');
    
    // Add more exceedances for the first workspace to show it's a problem account
    if (index === 0) {
      for (let i = 0; i < 3; i++) {
        const additionalBatch = startBatchProcessing('sms');
        additionalBatch(smsBatchSize, false, true, workspaceId, 'Rate limit exceeded for SMS');
      }
    }
    
    // Add Email rate limit exceedances for some workspaces
    if (index < 2) {
      const emailCompleteBatch = startBatchProcessing('email');
      const emailBatchSize = Math.floor(Math.random() * 8) + 3; // 3-11 messages
      emailCompleteBatch(emailBatchSize, false, true, workspaceId, 'Rate limit exceeded for Email');
    }
  });
  
  console.log('Added sample metrics data for testing the dashboard');
}

// Create Fastify instance
const fastify = Fastify({ logger: true });

const serverAdapter = new FastifyAdapter();

// Add basic auth middleware
serverAdapter.setBasePath("/admin/queues");

// Create Bull Board with all queues
createBullBoard({
  queues: [
    new BullMQAdapter(myQueue), 
    new BullMQAdapter(sendEmailQueue),
    new BullMQAdapter(scheduledEmailQueue),
    new BullMQAdapter(sendSMSQueue),
    new BullMQAdapter(scheduledSMSQueue)
  ],
  serverAdapter,
});

// Register the Bull Board plugin
fastify.register(serverAdapter.registerPlugin(), {
  prefix: "/admin/queues",
  basePath: "/admin/queues",
  // Add basic authentication
  beforeHandle: async (request, reply) => {
    const auth = request.headers.authorization;
    
    // Check if auth header exists and is in the correct format
    if (!auth || !auth.startsWith("Basic ")) {
      reply.header("WWW-Authenticate", "Basic");
      reply.code(401).send("Authentication required");
      return;
    }
    
    // Decode the base64 auth string
    const [username, password] = Buffer.from(auth.split(" ")[1], "base64")
      .toString()
      .split(":");
    
    // Check credentials against environment variables
    if (
      username !== env.BULL_BOARD_USERNAME ||
      password !== env.BULL_BOARD_PASSWORD
    ) {
      reply.header("WWW-Authenticate", "Basic");
      reply.code(401).send("Invalid credentials");
      return;
    }
  },
});

// Register static file serving for the UI
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/",
});

// Add route for dashboard
fastify.get("/dashboard", async (request, reply) => {
  // Try to serve from public directory first, then from dist/public as fallback
  try {
    return reply.sendFile("dashboard.html");
  } catch (error) {
    // If file not found in public dir, try dist/public
    fastify.log.info("Attempting to serve dashboard from dist/public directory");
    return reply.sendFile("dashboard.html", path.join(process.cwd(), "dist", "public"));
  }
});

// Register another static file server for dist/public
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), "dist", "public"),
  prefix: "/dist-public/",
  decorateReply: false // Don't decorate reply again
});

// Add routes for test pages
// Remove the custom route handlers since we're serving static files directly
// The files will be accessible at:
// - /test-sms.html
// - /test-email.html
// - /index.html

// API endpoint for scheduling SMS
fastify.post<{
  Body: {
    phoneNumber: string;
    message: string;
    contactId: string;
    workspaceId: string;
    delay: number;
    metadata?: Record<string, any>;
  };
}>("/api/schedule-sms", async (request, reply) => {
  try {
    const { phoneNumber, message, contactId, workspaceId, delay, metadata } = request.body;
    
    // Validate required fields
    if (!phoneNumber || !message || !contactId || !workspaceId) {
      return reply.code(400).send({
        success: false,
        message: "Missing required fields",
      });
    }
    
    // Prepare SMS data
    const smsData = {
      phoneNumber,
      message,
      contactId,
      workspaceId,
      metadata: metadata || {
        source: "test-ui",
        timestamp: new Date().toISOString(),
      },
    };
    
    let job;
    
    // Add to appropriate queue based on delay
    if (delay && delay > 0) {
      // Add to scheduled queue with delay
      job = await scheduledSMSQueue.add("scheduled-sms", smsData, {
        delay,
        removeOnComplete: false,
      });
      
      fastify.log.info(`Scheduled SMS job added with ID: ${job.id}, delay: ${delay}ms`);
    } else {
      // Add to immediate queue
      job = await sendSMSQueue.add("send-sms", smsData, {
        removeOnComplete: false,
      });
      
      fastify.log.info(`Immediate SMS job added with ID: ${job.id}`);
    }
    
    return {
      success: true,
      jobId: job.id,
      message: delay > 0 ? "SMS scheduled successfully" : "SMS queued for immediate delivery",
    };
  } catch (error) {
    fastify.log.error(`Error scheduling SMS: ${error}`);
    return reply.code(500).send({
      success: false,
      message: `Error scheduling SMS: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// API endpoint for scheduling Email
fastify.post<{
  Body: {
    to: string;
    subject: string;
    html: string;
    contactId: string;
    workspaceId: string;
    delay: number;
    metadata?: Record<string, any>;
  };
}>("/api/schedule-email", async (request, reply) => {
  try {
    const { to, subject, html, contactId, workspaceId, delay, metadata } = request.body;
    
    // Validate required fields
    if (!to || !subject || !html || !contactId || !workspaceId) {
      return reply.code(400).send({
        success: false,
        message: "Missing required fields",
      });
    }
    
    // Prepare Email data
    const emailData = {
      to,
      subject,
      html,
      contactId,
      workspaceId,
      metadata: metadata || {
        source: "api",
        timestamp: new Date().toISOString(),
        callbackEndpoint: "/api/email/send"
      },
    };
    
    let job;
    
    // Add to appropriate queue based on delay
    if (delay && delay > 0) {
      // Add to scheduled queue with delay
      job = await scheduledEmailQueue.add("scheduled-email", emailData, {
        delay,
        removeOnComplete: false,
      });
      
      fastify.log.info(`Scheduled Email job added with ID: ${job.id}, delay: ${delay}ms`);
    } else {
      // Add to immediate queue
      job = await sendEmailQueue.add("send-email", emailData, {
        removeOnComplete: false,
      });
      
      fastify.log.info(`Immediate Email job added with ID: ${job.id}`);
    }
    
    return {
      success: true,
      jobId: job.id,
      message: delay > 0 ? "Email scheduled successfully" : "Email queued for immediate delivery",
    };
  } catch (error) {
    fastify.log.error(`Error scheduling Email: ${error}`);
    return reply.code(500).send({
      success: false,
      message: `Error scheduling Email: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// Register metrics routes
fastify.register(metricsRoutes, { prefix: '/metrics' });

// Add a health check endpoint
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(env.PORT) || 3000, host: env.HOST || "0.0.0.0" });
    console.log(`Server is running on port ${env.PORT || 3000}`);
    console.log(`Bull Board UI is available at /admin/queues`);
    addSampleMetricsData();
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
