import { Worker, type Job } from "bullmq";
import { connection, defaultWorkerOpts } from "@/queues/configs";
import type { AIResponseData } from "@/queues/schemas/ai-response-schema";
import axios from "axios";
import { initAIResponseSubscription } from "@/services/ai-response-subscription";

const QUEUE_NAME = "ai-response-queue";

// Start the Supabase subscription service
let subscriptionCleanup: (() => void) | null = null;

export const startAIResponseSubscription = () => {
  if (!subscriptionCleanup) {
    subscriptionCleanup = initAIResponseSubscription();
    console.log("AI Response subscription service started");
  }
};

export const stopAIResponseSubscription = () => {
  if (subscriptionCleanup) {
    subscriptionCleanup();
    subscriptionCleanup = null;
    console.log("AI Response subscription service stopped");
  }
};

// Initialize the traditional BullMQ worker for backward compatibility
// and integration with Bull Board monitoring
export const aiResponseWorker = new Worker<AIResponseData>(
  QUEUE_NAME,
  async (job: Job<AIResponseData>) => {
    const { workspace_id, contact_id, message_id, message_text, callback_url } = job.data;

    try {
      // Get simple AI response for demo (in a real application, you would call an AI service here)
      const aiResponse = `This is a simulated AI response to: "${message_text}"\n\nOur services include queue management for SMS, email, and AI responses. We handle both immediate and scheduled message delivery with robust monitoring and error handling.`;
      
      await job.log(`Generated AI response for message ${message_id}`);
      
      // Check if callback is an SMS endpoint and format accordingly
      let payloadData;
      
      if (callback_url.includes('/send-sms')) {
        // Format for SMS API
        payloadData = {
          to: contact_id, // Using contact_id as the phone number for demo
          message: aiResponse,
          workspaceId: workspace_id,
          contactId: contact_id,
          metadata: {
            source: "ai_response",
            messageId: message_id,
            job_id: job.id,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // Standard format for AI response callback
        payloadData = {
          workspace_id,
          message_id,
          job_id: job.id,
          response_text: aiResponse
        };
      }
      
      // Call back to main application to process the AI response
      const response = await axios.post(callback_url, payloadData);

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
      duration: 1000, // per second
    },
  }
);
