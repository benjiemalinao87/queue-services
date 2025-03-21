import { z } from "zod";

export const smsSchema = z.object({
  // Phone number of the recipient (will be mapped to 'to' in the API)
  phoneNumber: z.string().min(1, "Phone number is required"),
  // Message content
  message: z.string().min(1, "Message is required"),
  // Optional scheduled time for delayed sending
  scheduledFor: z.string().optional().nullable(),
  // Contact ID for the recipient
  contactId: z.string().default("5346834e-479f-4c5f-a53c-7bf97837fd68"),
  // Workspace ID
  workspaceId: z.string().or(z.number()).default("66338"),
  // Additional metadata (optional)
  metadata: z.record(z.any()).optional(),
});

export type SMSData = z.infer<typeof smsSchema>;
