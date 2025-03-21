import { addSMSJob } from "./queues/sms-queue";
import { connection } from "./queues/configs";
import { Queue } from "bullmq";

// Get current time
const now = new Date();
console.log("=== Starting SMS API Integration Test ===");
console.log(`Current time: ${now.toISOString()}`);

// Set environment variables for Railway Redis public URL
process.env.REDIS_HOST = "redis-production-c503.up.railway.app";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

// Function to test sending an SMS with a delay
async function testSendDelayedSMS() {
  try {
    // Calculate time for 1 minute from now
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    
    console.log(`\n=== Testing Scheduled SMS ===`);
    console.log(`Scheduled for: ${oneMinuteFromNow.toISOString()}`);
    
    // Add a scheduled SMS job
    const result = await addSMSJob({
      phoneNumber: "+16263133690",
      message: "This is a test scheduled SMS from the queue service. Sent at: " + new Date().toISOString(),
      scheduledFor: oneMinuteFromNow.toISOString(),
      contactId: "5346834e-479f-4c5f-a53c-7bf97837fd68",
      workspaceId: "66338",
      metadata: {
        source: "queue-service-test",
        testId: "scheduled-sms-test-" + Date.now()
      }
    });
    
    console.log(`✅ Successfully added scheduled SMS job: ${result.id}`);
    console.log(`Job will be processed at approximately: ${oneMinuteFromNow.toISOString()}`);
    
    // Check the scheduled queue
    const scheduledSMSQueue = new Queue("scheduled-sms-queue", { connection });
    const scheduledCounts = await scheduledSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    console.log(`Scheduled SMS Queue job counts:`, scheduledCounts);
    
    // Close the queue connection
    await scheduledSMSQueue.close();
    
    console.log("\n=== Testing Immediate SMS ===");
    
    // Add an immediate SMS job
    const immediateResult = await addSMSJob({
      phoneNumber: "+16263133690",
      message: "This is a test immediate SMS from the queue service. Sent at: " + new Date().toISOString(),
      contactId: "5346834e-479f-4c5f-a53c-7bf97837fd68",
      workspaceId: "66338",
      metadata: {
        source: "queue-service-test",
        testId: "immediate-sms-test-" + Date.now()
      }
    });
    
    console.log(`✅ Successfully added immediate SMS job: ${immediateResult.id}`);
    
    // Check the immediate queue
    const sendSMSQueue = new Queue("send-sms-queue", { connection });
    const sendCounts = await sendSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    console.log(`Send SMS Queue job counts:`, sendCounts);
    
    // Close the queue connection
    await sendSMSQueue.close();
    
    console.log("\n=== SMS API Integration Test Completed ===");
    console.log("Check your phone for the immediate SMS and wait for the scheduled SMS to arrive in about 1 minute.");
    console.log("You can also check the Bull Board UI to see the jobs that were added.");
    
  } catch (error) {
    console.error("Error in SMS API test:", error);
  }
}

// Run the test
testSendDelayedSMS().catch(console.error);
