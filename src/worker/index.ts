import { sendSMSWorker, scheduledSMSWorker, smsBatchWorker } from "./sms-worker";
import { emailWorker, scheduledEmailWorker, emailBatchWorker } from "./email-worker";
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
    emailBatchWorker.close(),
    sendSMSWorker.close(),
    scheduledSMSWorker.close(),
    smsBatchWorker.close(),
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

// Log batch processing configuration
console.log("Batch processing configuration:");
console.log("SMS Concurrency:", smsBatchWorker.opts.concurrency);
console.log("SMS Rate Limit:", smsBatchWorker.opts.limiter?.max, "per", smsBatchWorker.opts.limiter?.duration, "ms");
console.log("Email Concurrency:", emailBatchWorker.opts.concurrency);
console.log("Email Rate Limit:", emailBatchWorker.opts.limiter?.max, "per", emailBatchWorker.opts.limiter?.duration, "ms");
