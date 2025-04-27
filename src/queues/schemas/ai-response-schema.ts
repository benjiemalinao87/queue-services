import { z } from "zod";

export const aiResponseSchema = z.object({
  workspace_id: z.string(),
  contact_id: z.string(),
  message_id: z.string(),
  message_text: z.string(),
  // For production use, the recommended callback URL is https://cc.automate8.com/send-sms
  // The worker will automatically format the payload correctly for this endpoint
  callback_url: z.string().url(),
  rate_limit_key: z.string(), // Format: workspace_id:contact_id for per-contact rate limiting
});

export type AIResponseData = z.infer<typeof aiResponseSchema>;

// Rate limiting configuration
export const rateLimitConfig = {
  perWorkspace: {
    points: 100, // Number of requests
    duration: 60, // Per minute
  },
  perContact: {
    points: 5, // Number of requests
    duration: 60, // Per minute
  },
};
