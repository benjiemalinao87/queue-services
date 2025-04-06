// Test script to send MMS (SMS with image) using the queue service without delay
import { addSMSJob } from './src/queues/sms-queue.js';
import { Queue } from 'bullmq';
import { connection } from './src/config/queue.config.js';

// Get current time
const now = new Date();
console.log("=== Starting Queue MMS Test ===");
console.log(`Current time: ${now.toISOString()}`);

// Function to test sending an immediate MMS via queue
async function testQueueMMS() {
  try {
    console.log("\n=== Testing Immediate MMS via Queue ===");
    
    // Add an immediate MMS job with image URL in metadata
    const mmsData = {
      phoneNumber: "+16267888830", // The phone number to send to
      message: "This is a test MMS sent via queue service at: " + new Date().toISOString(),
      contactId: "test-contact-id",
      workspaceId: "66338",
      metadata: {
        mediaUrl: "https://api.robolly.com/templates/66ee05c3a68f3f7e6f890661/render.jpg",
        source: "queue-test",
        testId: "queue-mms-test-" + Date.now()
      }
    };
    
    console.log("MMS Data:", mmsData);
    
    // Add job to the immediate queue (no scheduledFor date)
    const immediateResult = await addSMSJob(mmsData);
    
    console.log(`✅ Successfully added immediate MMS job: ${immediateResult.id}`);
    
    // Check the queue status
    const sendSMSQueue = new Queue("send-sms-queue", { connection });
    const queueCounts = await sendSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    console.log("Queue counts:", queueCounts);
    
    // Close the queue connection
    await sendSMSQueue.close();
    
    console.log("\n=== Queue MMS Test Completed ===");
    console.log("The MMS should be processed by the queue worker and sent immediately.");
    console.log("Check your phone for the message with image. It should arrive within seconds.");
    
  } catch (error) {
    console.error("Error in queue MMS test:", error);
  }
}

// Run the test
testQueueMMS().catch(console.error);
