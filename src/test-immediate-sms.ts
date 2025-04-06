import { addSMSJob } from "./queues/sms-queue.js";
import { connection } from "./config/queue.config.js";
import { Queue } from "bullmq";

// Get current time
const now = new Date();
console.log("=== Starting Immediate SMS Test ===");
console.log(`Current time: ${now.toISOString()}`);

// Function to test sending an immediate SMS
async function testSendImmediateSMS() {
  try {
    console.log("\n=== Testing Immediate SMS to +16266635938 ===");
    
    // Add an immediate SMS job
    const immediateResult = await addSMSJob({
      phoneNumber: "+16266635938",
      message: "This is a test immediate SMS from the queue service. Sent at: " + new Date().toISOString(),
      contactId: "test-contact-id", // Using a test contact ID
      workspaceId: "66338", // Using the provided workspace ID
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
    
    console.log("\n=== Immediate SMS Test Completed ===");
    console.log("Check your phone for the immediate SMS. It should arrive within seconds.");
    console.log("You can also check the Bull Board UI to see the job that was added.");
    
  } catch (error) {
    console.error("Error in immediate SMS test:", error);
  }
}

// Run the test
testSendImmediateSMS().catch(console.error);
