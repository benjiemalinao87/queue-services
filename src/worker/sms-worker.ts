import { Job, Worker } from "bullmq";
import { connection } from "@/queues/configs";
import { SMSData } from "@/queues/schemas";
import { env } from "@/env";
import fetch from "node-fetch";

// Function to send SMS via the API
async function sendSMSViaAPI(data: SMSData) {
  const { phoneNumber, message, contactId, workspaceId, metadata } = data;
  
  console.log("Sending message via API:", {
    to: phoneNumber,
    message,
    contactId,
    workspaceId,
  });
  
  const response = await fetch(`${env.SMS_API_URL}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phoneNumber,
      message,
      contactId,
      workspaceId,
      ...(metadata || {}),
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Missing required fields:", {
      to: phoneNumber,
      message,
      workspaceId,
      contactId
    });
    throw new Error(`SMS API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

// Create workers for both regular and scheduled SMS queues
export const sendSMSWorker = new Worker(
  "send-sms-queue",
  async (job: Job<SMSData>) => {
    const { phoneNumber, message, contactId, workspaceId, metadata } = job.data;
    
    // Log the job start
    console.log(`Processing SMS job ${job.id} to ${phoneNumber}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Log the SMS sending attempt
      console.log(`Sending SMS to ${phoneNumber}: ${message}`);
      console.log(`Contact ID: ${contactId}, Workspace ID: ${workspaceId}`);
      
      // Update job progress
      await job.updateProgress(30);
      
      // Actually send the SMS via the API
      const result = await sendSMSViaAPI(job.data);
      
      // Update job progress
      await job.updateProgress(80);
      
      console.log(`Successfully sent SMS to ${phoneNumber}`, result);
      
      // Update job progress to complete
      await job.updateProgress(100);
      
      // Return success result
      return {
        success: true,
        phoneNumber,
        message,
        sentAt: new Date().toISOString(),
        apiResponse: result,
        metadata,
      };
    } catch (error) {
      // Log the error
      console.error(`Error sending SMS to ${phoneNumber}:`, error);
      
      // Throw the error to trigger job failure and retry
      throw error;
    }
  },
  { connection }
);

export const scheduledSMSWorker = new Worker(
  "scheduled-sms-queue",
  async (job: Job<SMSData>) => {
    const { phoneNumber, message, scheduledFor, contactId, workspaceId, metadata } = job.data;
    
    // Log the job start
    console.log(`Processing scheduled SMS job ${job.id} to ${phoneNumber}`);
    console.log(`Originally scheduled for: ${scheduledFor}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Log the SMS sending attempt
      console.log(`Sending scheduled SMS to ${phoneNumber}: ${message}`);
      console.log(`Contact ID: ${contactId}, Workspace ID: ${workspaceId}`);
      
      // Update job progress
      await job.updateProgress(30);
      
      // Actually send the SMS via the API
      const result = await sendSMSViaAPI(job.data);
      
      // Update job progress
      await job.updateProgress(80);
      
      console.log(`Successfully sent scheduled SMS to ${phoneNumber}`, result);
      
      // Update job progress to complete
      await job.updateProgress(100);
      
      // Return success result
      return {
        success: true,
        phoneNumber,
        message,
        scheduledFor,
        sentAt: new Date().toISOString(),
        apiResponse: result,
        metadata,
      };
    } catch (error) {
      // Log the error
      console.error(`Error sending scheduled SMS to ${phoneNumber}:`, error);
      
      // Throw the error to trigger job failure and retry
      throw error;
    }
  },
  { connection }
);
