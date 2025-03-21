import { Job, Worker } from "bullmq";
import { connection } from "@/queues/configs";
import { EmailData } from "@/queues/schemas/email-schema";
import { env } from "@/env";
import fetch from "node-fetch";
import { sendEmailQueue, scheduledEmailQueue } from "@/queues/email-queue";

// Function to send Email via the API
async function sendEmailViaAPI(data: EmailData) {
  const { to, subject, html, contactId, workspaceId, metadata } = data;
  
  console.log("Sending email via API:", {
    to,
    subject,
    contactId,
    workspaceId,
  });
  
  // Get the callback endpoint from metadata or use default
  const callbackEndpoint = metadata?.callbackEndpoint || "/api/email/send";
  
  const response = await fetch(`${env.EMAIL_API_URL || 'https://cc.automate8.com'}${callbackEndpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-workspace-id": String(workspaceId)
    },
    body: JSON.stringify({
      contactId,
      subject,
      content: html,
      ...(metadata || {}),
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error sending email:", {
      to,
      subject,
      workspaceId,
      contactId,
      status: response.status,
      error: errorText
    });
    throw new Error(`Email API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Create workers for both regular and scheduled Email queues
export const emailWorker = new Worker(
  "send-email-queue",
  async (job: Job<EmailData>) => {
    const { to, subject, html, contactId, workspaceId, metadata } = job.data;
    
    // Log the job start
    console.log(`Processing Email job ${job.id} to ${to}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Log the Email sending attempt
      console.log(`Sending Email to ${to}: ${subject}`);
      console.log(`Contact ID: ${contactId}, Workspace ID: ${workspaceId}`);
      
      // Update job progress
      await job.updateProgress(30);
      
      // Actually send the Email via the API
      const result = await sendEmailViaAPI(job.data);
      
      // Update job progress
      await job.updateProgress(80);
      
      console.log(`Successfully sent Email to ${to}`, result);
      
      // Update job progress to complete
      await job.updateProgress(100);
      
      // Return success result
      return {
        success: true,
        to,
        subject,
        sentAt: new Date().toISOString(),
        apiResponse: result,
        metadata,
      };
    } catch (error) {
      // Log the error
      console.error(`Error sending Email to ${to}:`, error);
      
      // Throw the error to trigger job failure and retry
      throw error;
    }
  },
  { connection }
);

export const scheduledEmailWorker = new Worker(
  "scheduled-email-queue",
  async (job: Job<EmailData>) => {
    const { to, subject, html, scheduledFor, contactId, workspaceId, metadata } = job.data;
    
    // Log the job start
    console.log(`Processing scheduled Email job ${job.id} to ${to}`);
    console.log(`Scheduled for: ${scheduledFor}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Log the Email sending attempt
      console.log(`Sending scheduled Email to ${to}: ${subject}`);
      console.log(`Contact ID: ${contactId}, Workspace ID: ${workspaceId}`);
      
      // Update job progress
      await job.updateProgress(30);
      
      // Actually send the Email via the API
      const result = await sendEmailViaAPI(job.data);
      
      // Update job progress
      await job.updateProgress(80);
      
      console.log(`Successfully sent scheduled Email to ${to}`, result);
      
      // Update job progress to complete
      await job.updateProgress(100);
      
      // Return success result
      return {
        success: true,
        to,
        subject,
        sentAt: new Date().toISOString(),
        scheduledFor,
        apiResponse: result,
        metadata,
      };
    } catch (error) {
      // Log the error
      console.error(`Error sending scheduled Email to ${to}:`, error);
      
      // Throw the error to trigger job failure and retry
      throw error;
    }
  },
  { connection }
);

// Event handlers for email worker
emailWorker.on("completed", (job) => {
  console.info(`Completed email job ${job.id} - ${job.name}`);
});
emailWorker.on("failed", (job, err) => {
  console.error(`Failed email job ${job?.id} - ${job?.name} with ${err}`);
});
emailWorker.on("error", (err) => {
  console.error(`Error in email worker: ${err}`);
});

// Event handlers for scheduled email worker
scheduledEmailWorker.on("completed", (job) => {
  console.info(`Completed scheduled email job ${job.id} - ${job.name}`);
});
scheduledEmailWorker.on("failed", (job, err) => {
  console.error(`Failed scheduled email job ${job?.id} - ${job?.name} with ${err}`);
});
scheduledEmailWorker.on("error", (err) => {
  console.error(`Error in scheduled email worker: ${err}`);
});
