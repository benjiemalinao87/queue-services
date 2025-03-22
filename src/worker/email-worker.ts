import { Job, Worker } from "bullmq";
import { connection } from "@/queues/configs";
import { EmailData } from "@/queues/schemas/email-schema";
import { env } from "@/env";
import fetch from "node-fetch";
import { sendEmailQueue, scheduledEmailQueue } from "@/queues/email-queue";
import { connection, emailWorkerOpts } from "@/config/queue.config";
import { startBatchProcessing } from "@/utils/metrics";

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
  emailWorkerOpts // Use the worker options with limiter settings
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
  emailWorkerOpts // Use the worker options with limiter settings
);

// Create a batch processing worker for Email
export const emailBatchWorker = new Worker(
  "send-email-queue",
  async (job, token) => {
    // For batch processing, we need to check if job is an array
    // This is a workaround for TypeScript typing issues with BullMQ
    if (!Array.isArray(job)) {
      // If it's a single job, process it normally
      const { to, subject, html, contactId, workspaceId, metadata } = job.data;
      
      console.log(`Processing single Email job ${job.id} to ${to}`);
      
      try {
        await job.updateProgress(10);
        console.log(`Sending Email to ${to}: ${subject}`);
        const result = await sendEmailViaAPI(job.data);
        await job.updateProgress(100);
        
        return {
          success: true,
          to,
          subject,
          sentAt: new Date().toISOString(),
          apiResponse: result,
          metadata,
        };
      } catch (error) {
        console.error(`Error sending Email to ${to}:`, error);
        throw error;
      }
    }
    
    // Process as batch
    const jobs = job as unknown as Job<EmailData>[];
    console.log(`Processing batch of ${jobs.length} Email jobs`);
    
    // Start tracking metrics for this batch
    const completeBatchMetrics = startBatchProcessing('email');
    
    try {
      // Group emails by workspaceId for better organization
      const emailsByWorkspace: Record<string, Job<EmailData>[]> = {};
      
      jobs.forEach(job => {
        const { workspaceId } = job.data;
        if (!emailsByWorkspace[workspaceId]) {
          emailsByWorkspace[workspaceId] = [];
        }
        emailsByWorkspace[workspaceId].push(job);
      });
      
      // Process each workspace's emails
      const results = await Promise.all(
        Object.entries(emailsByWorkspace).map(async ([workspaceId, workspaceJobs]) => {
          console.log(`Processing ${workspaceJobs.length} emails for workspace ${workspaceId}`);
          
          // Update progress for all jobs
          await Promise.all(workspaceJobs.map(job => job.updateProgress(10)));
          
          // Prepare batch data
          const batchData = workspaceJobs.map(job => ({
            to: job.data.to,
            subject: job.data.subject,
            html: job.data.html,
            contactId: job.data.contactId,
            workspaceId: job.data.workspaceId,
            metadata: job.data.metadata,
            jobId: job.id
          }));
          
          // Update progress for all jobs
          await Promise.all(workspaceJobs.map(job => job.updateProgress(30)));
          
          try {
            // Send batch request to API (if your API supports batch operations)
            // If not, we'll process them in parallel but with rate limiting
            const responses = await Promise.all(
              batchData.map(async (data) => {
                // Get the callback endpoint from metadata or use default
                const callbackEndpoint = data.metadata?.callbackEndpoint || "/api/email/send";
                
                const response = await fetch(`${env.EMAIL_API_URL || 'https://cc.automate8.com'}${callbackEndpoint}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-workspace-id": String(data.workspaceId)
                  },
                  body: JSON.stringify({
                    contactId: data.contactId,
                    subject: data.subject,
                    content: data.html,
                    ...(data.metadata || {}),
                  }),
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Email API error: ${response.status} ${errorText}`);
                }
                
                return {
                  jobId: data.jobId,
                  response: await response.json(),
                  success: true
                };
              })
            );
            
            // Update progress for all jobs
            await Promise.all(workspaceJobs.map(job => job.updateProgress(80)));
            
            // Log success
            console.log(`Successfully processed batch of ${workspaceJobs.length} emails for workspace ${workspaceId}`);
            
            // Update progress to complete for all jobs
            await Promise.all(workspaceJobs.map(job => job.updateProgress(100)));
            
            return responses;
          } catch (error) {
            console.error(`Error processing batch for workspace ${workspaceId}:`, error);
            throw error;
          }
        })
      );
      
      // Record successful batch completion
      const metrics = completeBatchMetrics(jobs.length, true);
      console.log(`Batch processing metrics:`, metrics);
      
      // Flatten results
      return results.flat();
    } catch (error) {
      console.error("Error processing Email batch:", error);
      
      // Record failed batch
      const metrics = completeBatchMetrics(jobs.length, false, error instanceof Error && error.message.includes('rate limit'));
      console.log(`Batch processing failure metrics:`, metrics);
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 1000,
    }
  }
);

// Add event handlers for better monitoring
emailBatchWorker.on('completed', (job) => {
  console.log(`Completed Email batch job ${job.id}`);
});

emailBatchWorker.on('failed', (job, error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Failed Email batch job ${job?.id}: ${errorMessage}`);
});

emailBatchWorker.on('error', (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Email batch worker error: ${errorMessage}`);
});

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
