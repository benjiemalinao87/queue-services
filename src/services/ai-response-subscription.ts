import { supabase, updateAIResponseJobStatus } from "@/utils/supabase";
import axios from "axios";
import { env } from "@/env";
import { Redis } from "ioredis";

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USER || undefined,
  password: env.REDIS_PASSWORD || undefined,
});

// Rate limiting configuration
const rateLimitConfig = {
  maxConcurrent: 10,
  maxPerMinute: 60,
  perContact: {
    points: 5,
    duration: 60 // seconds
  }
};

// Track concurrent jobs
let currentlyProcessingJobs = 0;

// Helper function for rate limiting
const getRateLimitKey = (workspaceId: string, contactId: string) => 
  `rate_limit:ai_response:${workspaceId}:${contactId}`;

// Check if rate limit allows a new job
const checkRateLimit = async (workspaceId: string, contactId: string): Promise<boolean> => {
  const rateLimitKey = getRateLimitKey(workspaceId, contactId);
  const config = rateLimitConfig.perContact;

  // Check concurrent jobs limit
  if (currentlyProcessingJobs >= rateLimitConfig.maxConcurrent) {
    console.log(`Rate limit exceeded: ${currentlyProcessingJobs} concurrent jobs running (max: ${rateLimitConfig.maxConcurrent})`);
    return false;
  }

  const now = Date.now();
  const windowStart = now - (config.duration * 1000);

  // Remove old entries
  await redisClient.zremrangebyscore(rateLimitKey, 0, windowStart);

  // Get current count
  const count = await redisClient.zcard(rateLimitKey);

  if (count >= config.points) {
    console.log(`Rate limit exceeded for contact ${contactId}: ${count} requests in the last ${config.duration} seconds`);
    return false;
  }

  return true;
};

// Process a job from the ai_response_queue
const processJob = async (job: any) => {
  try {
    // Check if job already being processed or completed
    if (job.status !== "pending") {
      console.log(`Skipping job ${job.id} with status ${job.status}`);
      return;
    }

    // Check rate limits
    const isAllowed = await checkRateLimit(job.workspace_id, job.contact_id);
    if (!isAllowed) {
      console.log(`Rate limit applied for job ${job.id}, will retry later`);
      return;
    }

    // Update job status to processing
    await updateAIResponseJobStatus(job.id, "processing");

    // Track concurrent jobs
    currentlyProcessingJobs++;

    // Add rate limit record
    const rateLimitKey = getRateLimitKey(job.workspace_id, job.contact_id);
    await redisClient.zadd(rateLimitKey, Date.now(), `${Date.now()}-${Math.random()}`);
    await redisClient.expire(rateLimitKey, rateLimitConfig.perContact.duration * 2);

    // Call AI generation endpoint
    console.log(`Generating AI response for job ${job.id}`);
    const aiResponse = await axios.post(
      `${env.SMS_API_URL}/api/ai/generate-response`,
      {
        workspace_id: job.workspace_id,
        contact_id: job.contact_id,
        message_id: job.message_id
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // Check for successful response
    if (!aiResponse.data?.success) {
      throw new Error(`AI generation failed: ${aiResponse.data?.error || 'Unknown error'}`);
    }

    // Send SMS with generated response
    console.log(`Sending AI response via SMS for job ${job.id}`);
    const { response, logId, contact } = aiResponse.data;
    
    const smsResponse = await axios.post(
      `${env.SMS_API_URL}/send-sms`,
      {
        to: contact.phone,
        message: response,
        workspaceId: job.workspace_id,
        contactId: job.contact_id,
        metadata: {
          contactId: job.contact_id,
          isAiGenerated: true,
          aiLogId: logId
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // Update job status to complete
    await updateAIResponseJobStatus(job.id, "complete");
    console.log(`Successfully completed job ${job.id}`);

    return smsResponse.data;
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    
    // Update error status
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateAIResponseJobStatus(job.id, "error", { error: errorMessage });

    // If max attempts reached, mark as failed
    if (job.attempts >= 2) { // Max 3 attempts (starting from 0)
      await updateAIResponseJobStatus(job.id, "failed");
    }

    throw error;
  } finally {
    // Decrement concurrent jobs counter
    currentlyProcessingJobs--;
  }
};

// Initialize Supabase Realtime subscription
export const initAIResponseSubscription = () => {
  console.log("Initializing AI Response Queue Subscription...");

  const channel = supabase
    .channel('ai-responder-queue')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_response_queue',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('New AI response job received:', payload.new.id);
        // Process job immediately
        processJob(payload.new).catch(error => {
          console.error(`Error in job ${payload.new.id} subscription handler:`, error);
        });
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status:`, status);
    });

  // Also setup a polling mechanism as a fallback
  // Check every 30 seconds for any pending jobs that might have been missed
  const pollInterval = 30 * 1000; // 30 seconds
  const pollPendingJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_response_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);
        
      if (error) {
        console.error('Error polling for pending jobs:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} pending jobs to process`);
        
        // Process each job with slight delay to prevent overload
        for (const job of data) {
          setTimeout(() => {
            processJob(job).catch(error => {
              console.error(`Error processing polled job ${job.id}:`, error);
            });
          }, 1000 * Math.random()); // Random delay up to 1 second
        }
      }
    } catch (error) {
      console.error('Error in poll pending jobs:', error);
    }
  };

  // Start polling
  const intervalId = setInterval(pollPendingJobs, pollInterval);

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
    clearInterval(intervalId);
  };
}; 