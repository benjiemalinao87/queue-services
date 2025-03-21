import { Queue } from "bullmq";
import { connection, defaultJobOptions } from "./configs";
import { smsSchema } from "./schemas";

export const sendSMSQueue = new Queue("send-sms-queue", {
  connection,
  defaultJobOptions,
});

export const scheduledSMSQueue = new Queue("scheduled-sms-queue", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    // For scheduled messages, we want to keep them longer
    removeOnComplete: {
      age: 7 * 24 * 3600, // keep completed jobs for 7 days
      count: 1000, // keep the latest 1000 completed jobs
    },
  },
});

// Validate SMS data before adding to queue
export async function addSMSJob(data: unknown) {
  const validatedData = smsSchema.parse(data);
  
  // If scheduledFor is provided, add to scheduled queue
  if (validatedData.scheduledFor) {
    const scheduledTime = new Date(validatedData.scheduledFor);
    const now = new Date();
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());
    
    return scheduledSMSQueue.add("scheduled-sms", validatedData, {
      delay,
    });
  }
  
  // Otherwise, add to regular queue
  return sendSMSQueue.add("send-sms", validatedData);
}

// Export queues for use in other files
export const smsQueues = {
  sendSMSQueue,
  scheduledSMSQueue,
};
