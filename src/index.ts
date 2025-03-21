import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmailQueue } from "./queues/email-queue";
import { myQueue } from "./queues/my-queue";
import { sendSMSQueue, scheduledSMSQueue } from "./queues/sms-queue";
import { env } from "./env";

// Get current file path and directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

const serverAdapter = new FastifyAdapter();

// Add basic auth middleware
serverAdapter.setBasePath("/admin/queues");

// Create Bull Board with all queues
createBullBoard({
  queues: [
    new BullMQAdapter(myQueue), 
    new BullMQAdapter(sendEmailQueue),
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
  root: path.join(__dirname, "../public"),
  prefix: "/ui",
});

// UI route for testing SMS scheduling
fastify.get("/test-sms", async (request, reply) => {
  return reply.sendFile("test-sms.html", path.join(__dirname, "../public"));
});

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

// Add a health check endpoint
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    await fastify.listen({ port: Number(env.PORT) || 3000, host: env.HOST || "0.0.0.0" });
    console.log(`Server is running on port ${env.PORT || 3000}`);
    console.log(`Bull Board UI is available at /admin/queues`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
