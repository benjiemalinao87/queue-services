import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { sendEmailQueue, scheduledEmailQueue } from "./queues/email-queue";
import { myQueue } from "./queues/my-queue";
import { sendSMSQueue, scheduledSMSQueue } from "./queues/sms-queue";
import { aiResponseQueue } from "./queues/ai-response-queue";
import { env } from "./env";
import metricsRoutes from "./routes/metrics";
import aiResponseRoutes from "./routes/ai-response";
import { startBatchProcessing } from '@/utils/metrics';
import { sendSMSWorker, scheduledSMSWorker, smsBatchWorker } from './worker/sms-worker';
import { emailWorker, scheduledEmailWorker, emailBatchWorker } from './worker/email-worker';
import { aiResponseWorker } from './worker/ai-response-worker';

// Get current file path and directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Add sample metrics data for testing the dashboard
 */
function addSampleMetricsData() {
  // Use actual numeric IDs that match what's shown in the Bull dashboard
  const workspaceIds = ['66338', '66339', '66340', '66341', '66342'];
  
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
const fastify = Fastify({ 
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    },
    // Reduce memory usage by setting serialization options
    serializers: {
      req: (request) => {
        // Skip logging for health check requests
        if (request.url === '/health') {
          return undefined;
        }
        // Minimal request logging for other requests
        return {
          method: request.method,
          url: request.url,
        };
      },
      res: (reply) => {
        return {
          statusCode: reply.statusCode
        };
      }
    }
  }
});

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
    new BullMQAdapter(scheduledSMSQueue),
    new BullMQAdapter(aiResponseQueue)
  ],
  serverAdapter,
});

// Register the Bull Board plugin
// @ts-ignore - Ignoring type errors in the Bull Board plugin registration
fastify.register(serverAdapter.registerPlugin(), {
  prefix: "/admin/queues",
  basePath: "/admin/queues",
  // Add basic authentication
  beforeHandle: async (request: { headers: { authorization?: string } }, reply: { header: (name: string, value: string) => void; code: (statusCode: number) => { send: (body: string) => void } }) => {
    const auth = request.headers.authorization;
    
    // Check if auth header exists and is in the correct format
    if (!auth || !auth.startsWith("Basic ")) {
      reply.header("WWW-Authenticate", "Basic");
      reply.code(401).send("Authentication required");
      return;
    }
    
    // Decode the base64 auth string
    const [username, password] = Buffer.from(auth.split(" ")[1]!, "base64")
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
    
    // Generate a unique message ID for tracking
    const messageId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    
    // Calculate scheduledFor timestamp if delay is provided
    const now = new Date();
    const scheduledFor = delay && delay > 0 
      ? new Date(now.getTime() + delay).toISOString() 
      : now.toISOString();
    
    // Prepare SMS data with all fields needed for metrics tracking
    const smsData = {
      phoneNumber,
      message,
      contactId,
      workspaceId,
      // Add scheduledFor which is needed by the worker for metrics
      scheduledFor,
      // Add explicit trackMetrics flag
      trackMetrics: true,
      // Ensure metadata is properly structured with tracking info
      metadata: {
        ...(metadata || {}),
        source: metadata?.source || "api-schedule-sms",
        timestamp: now.toISOString(),
        messageId,
        // Add callback information similar to email implementation
        callbackEndpoint: "/api/sms/callback",
        // Include tracking information for metrics
        tracking: {
          messageId,
          workspaceId,
          contactId,
          trackMetrics: true
        }
      }
    };
    
    let job;
    
    // Add to appropriate queue based on delay
    if (delay && delay > 0) {
      // Add to scheduled queue with delay
      job = await scheduledSMSQueue.add("scheduled-sms", smsData, {
        delay,
        removeOnComplete: false,
      });
      
      fastify.log.info(`Scheduled SMS job added with ID: ${job.id}, delay: ${delay}ms, scheduled for: ${scheduledFor}`);
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

// Register AI response routes
fastify.register(aiResponseRoutes, { prefix: '/api/ai-response' });

// Add a health check endpoint
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(env.PORT) || 3000, host: env.HOST || "0.0.0.0" });
    console.log(`Server is running on port ${env.PORT || 3000}`);
    console.log(`Bull Board UI is available at /admin/queues`);
    
    // Only add sample metrics data if in development mode or if explicitly enabled
    if (env.NODE_ENV === 'development' || env.USE_SAMPLE_METRICS === 'true') {
      console.log('Adding sample metrics data for testing');
      addSampleMetricsData();
    } else {
      console.log('Running in production mode - using real metrics');
    }
    
    // Initialize workers
    console.log('Starting queue workers...');
    
    // Log worker events for better monitoring with proper type annotations
    sendSMSWorker.on('completed', (job: any) => {
      console.log(`SMS job ${job.id} completed`);
      // Update metrics for individual job
      const metrics = startBatchProcessing('sms');
      metrics(1, true, false, job.data.workspaceId);
      console.log(`Updated metrics for SMS job ${job.id} - workspace ${job.data.workspaceId}`);
    });
    
    sendSMSWorker.on('failed', (job: any, err: Error) => {
      console.error(`SMS job ${job?.id} failed: ${err}`);
      // Update metrics for failed job
      if (job?.data?.workspaceId) {
        const metrics = startBatchProcessing('sms');
        const isRateLimitError = err.message.includes('rate limit') || 
                                err.message.includes('too many requests') || 
                                err.message.includes('429');
        metrics(1, false, isRateLimitError, job.data.workspaceId, err.message);
        console.log(`Updated failure metrics for SMS job ${job.id} - workspace ${job.data.workspaceId}`);
      }
    });
    
    scheduledSMSWorker.on('completed', (job: any) => {
      console.log(`Scheduled SMS job ${job.id} completed`);
      // Update metrics for individual job
      const metrics = startBatchProcessing('sms');
      metrics(1, true, false, job.data.workspaceId);
      console.log(`Updated metrics for scheduled SMS job ${job.id} - workspace ${job.data.workspaceId}`);
    });
    
    scheduledSMSWorker.on('failed', (job: any, err: Error) => {
      console.error(`Scheduled SMS job ${job?.id} failed: ${err}`);
      // Update metrics for failed job
      if (job?.data?.workspaceId) {
        const metrics = startBatchProcessing('sms');
        const isRateLimitError = err.message.includes('rate limit') || 
                                err.message.includes('too many requests') || 
                                err.message.includes('429');
        metrics(1, false, isRateLimitError, job.data.workspaceId, err.message);
        console.log(`Updated failure metrics for scheduled SMS job ${job.id} - workspace ${job.data.workspaceId}`);
      }
    });
    
    emailWorker.on('completed', (job: any) => {
      console.log(`Email job ${job.id} completed`);
      // Update metrics for individual job
      const metrics = startBatchProcessing('email');
      metrics(1, true, false, job.data.workspaceId);
      console.log(`Updated metrics for email job ${job.id} - workspace ${job.data.workspaceId}`);
    });
    
    emailWorker.on('failed', (job: any, err: Error) => {
      console.error(`Email job ${job?.id} failed: ${err}`);
      // Update metrics for failed job
      if (job?.data?.workspaceId) {
        const metrics = startBatchProcessing('email');
        const isRateLimitError = err.message.includes('rate limit') || 
                                err.message.includes('too many requests') || 
                                err.message.includes('429');
        metrics(1, false, isRateLimitError, job.data.workspaceId, err.message);
        console.log(`Updated failure metrics for email job ${job.id} - workspace ${job.data.workspaceId}`);
      }
    });
    
    scheduledEmailWorker.on('completed', (job: any) => {
      console.log(`Scheduled Email job ${job.id} completed`);
      // Update metrics for individual job
      const metrics = startBatchProcessing('email');
      metrics(1, true, false, job.data.workspaceId);
      console.log(`Updated metrics for scheduled email job ${job.id} - workspace ${job.data.workspaceId}`);
    });
    
    scheduledEmailWorker.on('failed', (job: any, err: Error) => {
      console.error(`Scheduled Email job ${job?.id} failed: ${err}`);
      // Update metrics for failed job
      if (job?.data?.workspaceId) {
        const metrics = startBatchProcessing('email');
        const isRateLimitError = err.message.includes('rate limit') || 
                                err.message.includes('too many requests') || 
                                err.message.includes('429');
        metrics(1, false, isRateLimitError, job.data.workspaceId, err.message);
        console.log(`Updated failure metrics for scheduled email job ${job.id} - workspace ${job.data.workspaceId}`);
      }
    });
    
    // Also add listeners for batch workers
    smsBatchWorker.on('completed', (job: any) => {
      console.log(`SMS batch job ${job.id} completed`);
    });
    
    smsBatchWorker.on('failed', (job: any, err: Error) => {
      console.error(`SMS batch job ${job?.id} failed: ${err}`);
    });
    
    emailBatchWorker.on('completed', (job: any) => {
      console.log(`Email batch job ${job.id} completed`);
    });
    
    emailBatchWorker.on('failed', (job: any, err: Error) => {
      console.error(`Email batch job ${job?.id} failed: ${err}`);
    });
    
    // Add event handlers for AI response worker
    aiResponseWorker.on('completed', (job: any) => {
      console.log(`AI response job ${job.id} completed`);
      // Update metrics if needed
      console.log(`Successfully processed AI response for message ${job.data.message_id} in workspace ${job.data.workspace_id}`);
    });
    
    aiResponseWorker.on('failed', (job: any, err: Error) => {
      console.error(`AI response job ${job?.id} failed: ${err}`);
      if (job?.data?.workspace_id) {
        console.error(`Failed to process AI response for message ${job.data.message_id} in workspace ${job.data.workspace_id}: ${err.message}`);
      }
    });
    
    console.log('Queue workers started successfully');
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
