import { Job, Worker } from "bullmq";
import { connection, smsWorkerOpts } from "@/config/queue.config";
import { SMSData } from "@/queues/schemas";
import { env } from "@/env";
import fetch from "node-fetch";
import { startBatchProcessing } from "@/utils/metrics";

// Function to send SMS via the API
async function sendSMSViaAPI(data: SMSData) {
  const { phoneNumber, message, contactId, workspaceId, metadata, mediaUrl } = data;
  
  console.log("Sending message via API:", {
    to: phoneNumber,
    message,
    contactId,
    workspaceId,
    mediaUrl: mediaUrl ? mediaUrl : "Not present"
  });
  
  // Always use the standard /send-sms endpoint for both SMS and MMS
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
      mediaUrl, // Include mediaUrl in the request if present
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
  smsWorkerOpts  // Use the worker options with limiter settings
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
  smsWorkerOpts  // Use the worker options with limiter settings
);

// Create a batch processing worker for SMS
export const smsBatchWorker = new Worker(
  "send-sms-queue",
  async (job, token) => {
    // For batch processing, we need to check if job is an array
    // This is a workaround for TypeScript typing issues with BullMQ
    if (!Array.isArray(job)) {
      // If it's a single job, process it normally
      const { phoneNumber, message, contactId, workspaceId, metadata } = job.data;
      
      console.log(`Processing single SMS job ${job.id} to ${phoneNumber}`);
      
      try {
        await job.updateProgress(10);
        console.log(`Sending SMS to ${phoneNumber}: ${message}`);
        const result = await sendSMSViaAPI(job.data);
        await job.updateProgress(100);
        
        return {
          success: true,
          phoneNumber,
          message,
          sentAt: new Date().toISOString(),
          apiResponse: result,
          metadata,
        };
      } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
        throw error;
      }
    }
    
    // Process as batch
    const jobs = job as unknown as Job<SMSData>[];
    console.log(`Processing batch of ${jobs.length} SMS jobs`);
    
    // Start tracking metrics for this batch
    const completeBatchMetrics = startBatchProcessing('sms');
    
    try {
      // Group messages by workspaceId for better organization
      const messagesByWorkspace: Record<string, Job<SMSData>[]> = {};
      
      jobs.forEach(job => {
        const { workspaceId } = job.data;
        if (!messagesByWorkspace[workspaceId]) {
          messagesByWorkspace[workspaceId] = [];
        }
        messagesByWorkspace[workspaceId].push(job);
      });
      
      // Process each workspace's messages
      const results = await Promise.all(
        Object.entries(messagesByWorkspace).map(async ([workspaceId, workspaceJobs]) => {
          console.log(`Processing ${workspaceJobs.length} SMS for workspace ${workspaceId}`);
          
          // Update progress for all jobs
          await Promise.all(workspaceJobs.map(job => job.updateProgress(10)));
          
          // Prepare batch data
          const batchData = workspaceJobs.map(job => ({
            to: job.data.phoneNumber,
            message: job.data.message,
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
                const response = await fetch(`${env.SMS_API_URL}/send-sms`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    to: data.to,
                    message: data.message,
                    contactId: data.contactId,
                    workspaceId: data.workspaceId,
                    ...(data.metadata || {}),
                  }),
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`SMS API error: ${response.status} ${errorText}`);
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
            console.log(`Successfully processed batch of ${workspaceJobs.length} SMS for workspace ${workspaceId}`);
            
            // Update progress to complete for all jobs
            await Promise.all(workspaceJobs.map(job => job.updateProgress(100)));
            
            return responses;
          } catch (error) {
            console.error(`Error processing batch for workspace ${workspaceId}:`, error);
            
            // Check if this is a rate limit error
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRateLimitError = errorMessage.includes('rate limit') || 
                                    errorMessage.includes('too many requests') || 
                                    errorMessage.includes('429');
            
            // If it's a rate limit error, track it for this workspace
            if (isRateLimitError) {
              console.warn(`Rate limit exceeded for workspace ${workspaceId} when processing ${workspaceJobs.length} SMS messages`);
            }
            
            throw error;
          }
        })
      );
      
      // Record successful batch completion with workspace information
      // Group jobs by workspace to update metrics for each workspace
      const workspaceGroups: Record<string, number> = {};
      
      jobs.forEach(job => {
        const { workspaceId } = job.data;
        if (!workspaceGroups[workspaceId]) {
          workspaceGroups[workspaceId] = 0;
        }
        workspaceGroups[workspaceId]++;
      });
      
      // Update metrics for each workspace
      Object.entries(workspaceGroups).forEach(([workspaceId, count]) => {
        const workspaceMetrics = startBatchProcessing('sms');
        workspaceMetrics(count, true, false, workspaceId);
        console.log(`Updated metrics for workspace ${workspaceId}: ${count} messages processed successfully`);
      });
      
      // Flatten results
      return results.flat();
    } catch (error) {
      console.error("Error processing SMS batch:", error);
      
      // Check if this is a rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimitError = errorMessage.includes('rate limit') || 
                              errorMessage.includes('too many requests') || 
                              errorMessage.includes('429');
      
      // Get the workspace ID from the error context if possible
      let affectedWorkspaceId: string | undefined;
      
      if (error instanceof Error && 'workspaceId' in error && (error as any).workspaceId) {
        affectedWorkspaceId = String((error as any).workspaceId);
      } else if (jobs.length > 0 && jobs[0]?.data?.workspaceId) {
        // If we can't get it from the error, use the first job's workspace ID as a fallback
        affectedWorkspaceId = String(jobs[0].data.workspaceId);
      }
      
      // Record failed batch with workspace information if it's a rate limit error
      const metrics = completeBatchMetrics(
        jobs.length, 
        false, 
        isRateLimitError,
        affectedWorkspaceId,
        errorMessage
      );
      
      console.log(`Batch processing failure metrics:`, metrics);
      
      // Group jobs by workspace to update metrics for each workspace
      const workspaceGroups: Record<string, number> = {};
      
      jobs.forEach(job => {
        const { workspaceId } = job.data;
        if (!workspaceGroups[workspaceId]) {
          workspaceGroups[workspaceId] = 0;
        }
        workspaceGroups[workspaceId]++;
      });
      
      // Update metrics for each workspace
      Object.entries(workspaceGroups).forEach(([workspaceId, count]) => {
        const workspaceMetrics = startBatchProcessing('sms');
        workspaceMetrics(
          count, 
          false, 
          isRateLimitError, 
          workspaceId,
          errorMessage
        );
        console.log(`Updated failure metrics for workspace ${workspaceId}: ${count} messages failed${isRateLimitError ? ' (rate limited)' : ''}`);
      });
      
      console.log(`Batch processing failure metrics updated for all workspaces`);
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 1000,
    }
  }
);

// Add event handlers for better monitoring
smsBatchWorker.on('completed', (job) => {
  console.log(`Completed SMS batch job ${job.id}`);
});

smsBatchWorker.on('failed', (job, error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Failed SMS batch job ${job?.id}: ${errorMessage}`);
  
  // Check if this is a rate limit error
  const isRateLimitError = errorMessage.includes('rate limit') || 
                          errorMessage.includes('too many requests') || 
                          errorMessage.includes('429');
  
  // If it's a rate limit error and we have a job with workspace ID, log it specifically
  if (isRateLimitError && job && typeof job === 'object' && 'data' in job) {
    try {
      const jobData = (job as any).data;
      if (jobData && typeof jobData === 'object' && 'workspaceId' in jobData) {
        const workspaceId = String(jobData.workspaceId);
        console.warn(`Rate limit exceeded for workspace ${workspaceId}`);
      }
    } catch (err) {
      console.error('Error extracting workspace ID from failed job:', err);
    }
  }
});

smsBatchWorker.on('error', (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`SMS batch worker error: ${errorMessage}`);
});
