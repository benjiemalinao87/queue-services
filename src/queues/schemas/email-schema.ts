import { z } from "zod";

export const emailSchema = z.object({
  // Email address of the recipient
  to: z.string().email("Valid email is required"),
  // Email subject
  subject: z.string().min(1, "Subject is required"),
  // Email content (HTML)
  html: z.string().min(1, "Content is required"),
  // Optional scheduled time for delayed sending
  scheduledFor: z.string().optional().nullable(),
  // Contact ID for the recipient
  contactId: z.string().min(1, "Contact ID is required"),
  // Workspace ID
  workspaceId: z.string().or(z.number()).min(1, "Workspace ID is required"),
  // Additional metadata (optional)
  metadata: z.record(z.any()).optional(),
});

export type EmailData = z.infer<typeof emailSchema>;
