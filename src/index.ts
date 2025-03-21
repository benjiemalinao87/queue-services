import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import Fastify from "fastify";
import { sendEmailQueue } from "./queues/email-queue";
import { myQueue } from "./queues/my-queue";
import { sendSMSQueue, scheduledSMSQueue } from "./queues/sms-queue";
import { env } from "./env";

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
