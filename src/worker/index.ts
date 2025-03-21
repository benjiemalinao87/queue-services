import { sendSMSWorker, scheduledSMSWorker } from "./sms-worker";
import { emailWorker, scheduledEmailWorker } from "./email-worker";

// Set environment variables for Railway Redis public URL
process.env.REDIS_HOST = "redis-production-c503.up.railway.app";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

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
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD ? "******" : undefined,
});
