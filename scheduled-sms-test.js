// Test script to send scheduled SMS via the queue service
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Configuration
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || "https://cc.automate8.com";
const WORKSPACE_ID = '15213';
const TEST_PHONE = '+16266635938';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';
const TEST_EMAIL = 'benjiemalinao87@gmail.com';

// Schedule time (3 minutes from now)
const now = new Date();
const scheduledTime = new Date(now.getTime() + 3 * 60000); // 3 minutes in the future
const timestamp = now.toISOString();
const scheduledTimeIso = scheduledTime.toISOString();

console.log("=== Starting Scheduled SMS Test ===");
console.log(`Current time: ${timestamp}`);
console.log(`Scheduled time: ${scheduledTimeIso}`);

// Function to test sending scheduled SMS
async function testScheduledSMS() {
  try {
    // Prepare the test data for scheduled SMS
    const testData = {
      to: TEST_PHONE,
      message: `This is a SCHEDULED SMS that was queued at: ${timestamp} and scheduled for: ${scheduledTimeIso}`,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      // Use scheduledFor for the timestamp when the message should be sent
      scheduledFor: scheduledTimeIso,
      delay: 3 * 60000, // 3 minutes in milliseconds
      metadata: {
        source: 'scheduled_sms_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        email: TEST_EMAIL,
        timestamp: timestamp
      }
    };
    
    console.log("Test data:", testData);
    
    // Use the /send-sms endpoint with the delay parameter for scheduled messages
    console.log(`Sending request to ${QUEUE_SERVICE_URL}/send-sms`);
    const response = await fetch(`${QUEUE_SERVICE_URL}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    // Log the response
    console.log("Response status:", response.status);
    const result = await response.json();
    console.log("API Response:", JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Scheduled SMS queued successfully!');
      console.log(`Job ID: ${result.jobId}`);
      console.log(`The message is scheduled to be sent at: ${scheduledTimeIso}`);
      console.log(`(That's approximately ${Math.round(3)} minutes from now)`);
    } else {
      console.error('❌ Scheduled SMS queuing failed!');
    }
    
    console.log("=== Scheduled SMS Test Completed ===");
    console.log("You should receive the SMS at the scheduled time.");
    
  } catch (error) {
    console.error("Error in scheduled SMS test:", error);
  }
}

// Run the test
testScheduledSMS().catch(console.error);
