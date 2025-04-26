import { Worker, type Job } from "bullmq";
import { connection, defaultWorkerOpts } from "@/queues/configs";
import type { AIResponseData } from "@/queues/schemas/ai-response-schema";
import axios from "axios";

const QUEUE_NAME = "ai-response-queue";

export const aiResponseWorker = new Worker<AIResponseData>(
  QUEUE_NAME,
  async (job: Job<AIResponseData>) => {
    const { workspace_id, message_id, callback_url } = job.data;

    try {
      // Call back to main application to process the AI response
      const response = await axios.post(callback_url, {
        workspace_id,
        message_id,
        job_id: job.id,
      });

      // Log success metrics
      await job.log(`Successfully processed AI response for message ${message_id}`);
      await job.updateProgress(100);

      return response.data;
    } catch (error: unknown) {
      // Log error for monitoring
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      await job.log(`Error processing AI response: ${errorMessage}`);
      
      // Throw error to trigger job retry
      throw error;
    }
  },
  {
    ...defaultWorkerOpts,
    connection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 10, // Maximum number of jobs processed
      duration: 1000, // Per second
    },
  }
);
