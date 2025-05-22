// Test scheduling SMS using BullMQ directly
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// Configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const WORKSPACE_ID = '15213';
const TEST_PHONE = '+16266635938';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';

// Delay times in minutes
const delayTimes = [1, 2, 3, 5];

async function testScheduledSMS() {
  console.log("=== Testing BullMQ Scheduled SMS ===");
  console.log("Current time:", new Date().toISOString());
  
  // Test Redis connectivity
  console.log("Testing Redis connectivity...");
  const redis = new Redis(REDIS_URL);
  
  redis.on('connect', () => {
    console.log("Connected to Redis");
  });
  
  redis.on('error', (err) => {
    console.error("Redis error:", err.message);
  });
  
  try {
    // Check Redis connection
    const pingResult = await redis.ping();
    console.log(`Redis ping result: ${pingResult}`);
    
    // Create a temporary test queue
    const queueName = `scheduled-sms-test-${Date.now()}`;
    console.log(`Creating queue: ${queueName}`);
    
    const smsQueue = new Queue(queueName, {
      connection: redis
    });
    
    console.log("Queue created successfully");
    
    // Schedule messages with different delays
    console.log(`\nScheduling ${delayTimes.length} messages with various delays...`);
    
    const jobPromises = delayTimes.map(async (delayMinutes) => {
      const scheduledTime = new Date(Date.now() + delayMinutes * 60000);
      const messageId = randomUUID();
      
      console.log(`\n--- Scheduling message with ${delayMinutes} minute delay ---`);
      console.log(`Scheduled time: ${scheduledTime.toISOString()}`);
      
      const jobData = {
        phoneNumber: TEST_PHONE,
        message: `BullMQ Scheduled SMS (${delayMinutes}min delay) ID: ${messageId}`,
        contactId: TEST_CONTACT_ID,
        workspaceId: WORKSPACE_ID,
        metadata: {
          source: 'bullmq_scheduled_test',
          messageId,
          delayMinutes
        }
      };
      
      // Add job to the queue with the specified delay
      const job = await smsQueue.add(
        `scheduled-sms-${delayMinutes}min`, 
        jobData, 
        {
          delay: delayMinutes * 60000,  // Delay in milliseconds
          removeOnComplete: false,      // Keep job in completed list
          removeOnFail: false           // Keep job in failed list
        }
      );
      
      console.log(`Job added to queue with ID: ${job.id}`);
      console.log(`Scheduled for: ${scheduledTime.toISOString()}`);
      
      return {
        jobId: job.id,
        delayMinutes,
        scheduledTime: scheduledTime.toISOString()
      };
    });
    
    const results = await Promise.all(jobPromises);
    
    // Output summary
    console.log("\n=== Scheduled SMS Test Summary ===");
    console.log(`Successfully scheduled ${results.length} messages`);
    console.log("Jobs scheduled:");
    
    results.forEach(result => {
      console.log(`- ${result.delayMinutes} minute delay: Job ID ${result.jobId}, scheduled for ${result.scheduledTime}`);
    });
    
    // Note about message processing
    console.log("\nNOTE: These messages will remain in the queue but won't be processed");
    console.log("as there's no worker attached to this test queue.");
    console.log("This test only verifies that jobs can be scheduled with delays.");
    
    // Clean up - close the queue and Redis connection
    await smsQueue.close();
    await redis.quit();
    
  } catch (error) {
    console.error("Error in BullMQ scheduled SMS test:", error);
  }
}

// Run the test
testScheduledSMS().catch(console.error);
