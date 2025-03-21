/**
 * Test Email Queues
 * 
 * This script tests the email queue functionality by adding a test email job
 * to both the immediate and scheduled email queues.
 */

import { sendEmailQueue, scheduledEmailQueue } from "./queues/email-queue";

async function testEmailQueues() {
  console.log("Testing Email Queues...");
  
  // Test data for email
  const emailData = {
    to: "test@example.com",
    subject: "Test Email from Queue Services",
    html: "<h1>Hello from Queue Services!</h1><p>This is a test email sent via the queue system.</p>",
    contactId: "289d0731-d103-4042-92fa-1530d3cd8c02",
    workspaceId: "66338",
    metadata: {
      source: "test-script",
      timestamp: new Date().toISOString(),
      callbackEndpoint: "/api/email/send"
    }
  };
  
  try {
    // Add job to immediate queue
    const immediateJob = await sendEmailQueue.add("send-email", emailData, {
      removeOnComplete: false,
    });
    
    console.log(`Added immediate email job with ID: ${immediateJob.id}`);
    
    // Add job to scheduled queue with 30 second delay
    const scheduledJob = await scheduledEmailQueue.add("scheduled-email", emailData, {
      delay: 30000, // 30 seconds
      removeOnComplete: false,
    });
    
    console.log(`Added scheduled email job with ID: ${scheduledJob.id} (30 second delay)`);
    
    console.log("Test completed successfully. Check Bull Board UI to see the jobs.");
    console.log("Note: The worker process must be running to process these jobs.");
    
  } catch (error) {
    console.error("Error testing email queues:", error);
  }
  
  // Close connections
  await sendEmailQueue.close();
  await scheduledEmailQueue.close();
}

// Run the test
testEmailQueues().catch(console.error);
