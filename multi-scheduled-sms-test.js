// Test script to send multiple scheduled SMS via the queue service
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Configuration
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || "https://cc.automate8.com";
const WORKSPACE_ID = '15213';
const TEST_PHONE = '+16266635938';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';
const TEST_EMAIL = 'benjiemalinao87@gmail.com';

// Current time
const now = new Date();
const timestamp = now.toISOString();

console.log("=== Starting Multiple Scheduled SMS Test ===");
console.log(`Current time: ${timestamp}`);

// Delay times in minutes
const delayTimes = [1, 2, 3, 5];

// Function to test sending scheduled SMS with a specific delay
async function testScheduledSMS(delayMinutes) {
  try {
    // Calculate scheduled time
    const scheduledTime = new Date(now.getTime() + delayMinutes * 60000);
    const scheduledTimeIso = scheduledTime.toISOString();
    
    console.log(`\n--- Testing ${delayMinutes} minute delay ---`);
    console.log(`Scheduled time: ${scheduledTimeIso}`);
    
    // Prepare the test data for scheduled SMS
    const testData = {
      to: TEST_PHONE,
      message: `This is a SCHEDULED SMS with ${delayMinutes} min delay that was queued at: ${timestamp} and scheduled for: ${scheduledTimeIso}`,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      // Use scheduledFor for the timestamp when the message should be sent
      scheduledFor: scheduledTimeIso,
      delay: delayMinutes * 60000, // Convert minutes to milliseconds
      metadata: {
        source: 'multi_scheduled_sms_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        email: TEST_EMAIL,
        timestamp: timestamp,
        delayMinutes: delayMinutes
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
      console.log(`✅ Scheduled SMS with ${delayMinutes} minute delay queued successfully!`);
      console.log(`Job ID: ${result.jobId || 'N/A'}`);
      console.log(`The message is scheduled to be sent at: ${scheduledTimeIso}`);
      console.log(`(That's approximately ${delayMinutes} minutes from now)`);
      return true;
    } else {
      console.error(`❌ Scheduled SMS with ${delayMinutes} minute delay queuing failed!`);
      return false;
    }
  } catch (error) {
    console.error(`Error in scheduled SMS test with ${delayMinutes} minute delay:`, error);
    return false;
  }
}

// Run all tests sequentially
async function runAllTests() {
  console.log(`Will send ${delayTimes.length} scheduled messages with delays: ${delayTimes.join(', ')} minutes`);
  
  let successCount = 0;
  
  // Process each delay time sequentially
  for (const delayMinutes of delayTimes) {
    const success = await testScheduledSMS(delayMinutes);
    if (success) successCount++;
    
    // Add a small delay between API calls to avoid rate limiting
    if (delayMinutes !== delayTimes[delayTimes.length - 1]) {
      console.log("Waiting 2 seconds before sending next message...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log("\n=== Multiple Scheduled SMS Test Completed ===");
  console.log(`Successfully queued ${successCount} out of ${delayTimes.length} messages`);
  console.log("You should receive the SMS messages at their scheduled times.");
  console.log("Expected delivery times:");
  
  delayTimes.forEach(delayMinutes => {
    const deliveryTime = new Date(now.getTime() + delayMinutes * 60000);
    console.log(`- ${delayMinutes} minute delay: ${deliveryTime.toISOString()}`);
  });
}

// Run the tests
runAllTests().catch(console.error);
