// Scheduled email test using the production scheduled-email-queue
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
const TEST_EMAIL = 'benjiemalinao87@gmail.com';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';
const WORKSPACE_ID = '15213';

async function testScheduledEmail() {
  console.log("=== Testing Scheduled Email ===");
  console.log("Current time:", new Date().toISOString());
  
  try {
    // Create the standard scheduled-email-queue that's visible in the dashboard
    const scheduledEmailQueue = new Queue("scheduled-email-queue", { connection });
    
    console.log("Queue connected successfully");
    
    // Current time and scheduled time (7.5 minutes from now)
    const now = new Date();
    const delay = 7.5 * 60 * 1000; // 7.5 minutes in milliseconds
    const scheduledTime = new Date(now.getTime() + delay);
    console.log(`Scheduling email for: ${scheduledTime.toISOString()}`);
    
    // Create job data with all required fields
    const jobData = {
      to: TEST_EMAIL,
      subject: `Test Scheduled Email (${now.toISOString()})`,
      html: `
        <h1>This is a test scheduled email</h1>
        <p>This email was queued at: ${now.toISOString()}</p>
        <p>It was scheduled for delivery at: ${scheduledTime.toISOString()}</p>
        <p>That's approximately 7.5 minutes later.</p>
        <p><strong>Contact ID:</strong> ${TEST_CONTACT_ID}</p>
        <p><strong>Workspace ID:</strong> ${WORKSPACE_ID}</p>
      `,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      scheduledFor: scheduledTime.toISOString(),
      metadata: {
        source: 'scheduled_email_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        timestamp: now.toISOString()
      }
    };
    
    console.log("Job data prepared");
    
    // Add the job to the standard queue with a 7.5-minute delay
    const job = await scheduledEmailQueue.add("scheduled-email", jobData, {
      delay: delay,
      removeOnComplete: false, // Keep the job in the completed list
      removeOnFail: false // Keep the job in the failed list
    });
    
    console.log(`✅ Successfully added scheduled email job: ${job.id}`);
    console.log(`Job will be processed at approximately: ${scheduledTime.toISOString()}`);
    console.log("You can now check the Bull Dashboard to see this job in the DELAYED status");
    console.log("Dashboard URL: https://secivres-eueuq.customerconnects.app/admin/queues/status/delayed");
    
    // Close the queue connection
    await scheduledEmailQueue.close();
    console.log("Queue connection closed");
    
  } catch (error) {
    console.error("Error testing scheduled email:", error);
  }
}

// Run the test
testScheduledEmail().catch(console.error);
