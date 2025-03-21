import { sendSMSWorker, scheduledSMSWorker } from "./sms-worker";
import { emailWorker, scheduledEmailWorker } from "./email-worker";
import { Worker } from "bullmq";
import { env } from "../env";

// Use environment variables for Redis configuration
// DO NOT hardcode credentials here

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down workers...");
  
  // Close all workers
  await Promise.all([
    emailWorker.close(),
    scheduledEmailWorker.close(),
    sendSMSWorker.close(),
    scheduledSMSWorker.close(),
  ]);
  
  console.log("Workers closed successfully");
  process.exit(0);
};

// Listen for termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

console.log("Workers started successfully");
console.log("Redis connection:", {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD ? "******" : undefined,
});
