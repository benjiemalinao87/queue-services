// Standard delayed SMS test using the production scheduled-sms-queue
import { Queue } from "bullmq";
import { randomUUID } from 'crypto';

// Railway proxy details for Redis connection
const RAILWAY_PROXY_HOST = "caboose.proxy.rlwy.net";
const RAILWAY_PROXY_PORT = 58064;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

// Connection configuration that works with our other tests
const connection = {
  host: RAILWAY_PROXY_HOST,
  port: RAILWAY_PROXY_PORT,
  password: REDIS_PASSWORD,
};

// User information
const TEST_PHONE = '+16266635938';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';
const WORKSPACE_ID = '15213';
const TEST_EMAIL = 'benjiemalinao87@gmail.com';

async function testStandardDelayedSMS() {
  console.log("=== Testing Standard Delayed SMS ===");
  console.log("Current time:", new Date().toISOString());
  
  try {
    // Create the standard scheduled-sms-queue that's visible in the dashboard
    const scheduledSMSQueue = new Queue("scheduled-sms-queue", { connection });
    
    console.log("Queue connected successfully");
    
    // Current time and scheduled time (5 minutes from now)
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 300000);
    console.log(`Scheduling SMS for: ${fiveMinutesFromNow.toISOString()}`);
    
    // Create job data with all required fields
    const jobData = {
      phoneNumber: TEST_PHONE,
      message: `This is a standard DELAYED SMS that was queued at: ${now.toISOString()} and scheduled for: ${fiveMinutesFromNow.toISOString()}`,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      scheduledFor: fiveMinutesFromNow.toISOString(),
      metadata: {
        source: 'standard_delayed_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        email: TEST_EMAIL,
        timestamp: now.toISOString()
      }
    };
    
    console.log("Job data:", JSON.stringify(jobData, null, 2));
    
    // Add the job to the standard queue with a 5-minute delay
    const job = await scheduledSMSQueue.add("scheduled-sms", jobData, {
      delay: 300000, // 5 minutes
      removeOnComplete: false, // Keep the job in the completed list
      removeOnFail: false // Keep the job in the failed list
    });
    
    console.log(`✅ Successfully added delayed SMS job: ${job.id}`);
    console.log(`Job will be processed at approximately: ${fiveMinutesFromNow.toISOString()}`);
    console.log("You can now check the Bull Dashboard to see this job in the DELAYED status");
    console.log("Dashboard URL: https://secivres-eueuq.customerconnects.app/admin/queues/status/delayed");
    
    // Close the queue connection
    await scheduledSMSQueue.close();
    console.log("Queue connection closed");
    
  } catch (error) {
    console.error("Error testing standard delayed SMS:", error);
  }
}

// Run the test
testStandardDelayedSMS().catch(console.error);
