import { Queue } from "bullmq";
import { connection, defaultJobOptions } from "@/config/queue.config";
import { emailSchema } from "./schemas/email-schema";
import type { EmailData } from "./schemas/email-schema";

export const sendEmailQueue = new Queue("send-email-queue", {
  connection,
  defaultJobOptions,
  limiter: {
    max: 100,       // Maximum number of jobs processed per time window
    duration: 1000, // Time window in milliseconds (1 second)
  }
});

export const scheduledEmailQueue = new Queue("scheduled-email-queue", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    // For scheduled messages, we want to keep them longer
    removeOnComplete: {
      age: 7 * 24 * 3600, // keep completed jobs for 7 days
      count: 1000, // keep the latest 1000 completed jobs
    },
  },
  limiter: {
    max: 100,       // Maximum number of jobs processed per time window
    duration: 1000, // Time window in milliseconds (1 second)
  }
});

// Validate email data before adding to queue
export async function addEmailJob(data: unknown) {
  const validatedData = emailSchema.parse(data);
  
  // If scheduledFor is provided, add to scheduled queue
  if (validatedData.scheduledFor) {
    const scheduledTime = new Date(validatedData.scheduledFor);
    const now = new Date();
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());
    
    return scheduledEmailQueue.add("scheduled-email", validatedData, {
      delay,
    });
  }
  
  // Otherwise, add to regular queue
  return sendEmailQueue.add("send-email", validatedData);
}

// Export queues for use in other files
export const emailQueues = {
  sendEmailQueue,
  scheduledEmailQueue,
};
