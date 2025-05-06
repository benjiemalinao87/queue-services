// Test script to send scheduled SMS via the queue service using correct endpoint
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Configuration
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || "https://secivres-eueuq.customerconnects.app";
const WORKSPACE_ID = '15213';
const TEST_PHONE = '+16266635938';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';
const TEST_EMAIL = 'benjiemalinao87@gmail.com';

// Current time
const now = new Date();
const timestamp = now.toISOString();

console.log("=== Starting Properly Configured Scheduled SMS Test ===");
console.log(`Current time: ${timestamp}`);

// Delay times in minutes
const delayTimes = [1, 2, 3, 5];

// Function to test sending scheduled SMS with a specific delay
async function testScheduledSMS(delayMinutes) {
  try {
    // Calculate delay in milliseconds
    const delayMs = delayMinutes * 60000;
    
    console.log(`\n--- Testing ${delayMinutes} minute delay (${delayMs}ms) ---`);
    
    // Create unique messageId for this test
    const messageId = randomUUID();
    
    // Prepare the test data for scheduled SMS - using the format from instructions.md
    // and matching the structure expected by the worker for metrics tracking
    const testData = {
      phoneNumber: TEST_PHONE, 
      message: `Properly scheduled SMS (${delayMinutes}min delay) queued at: ${timestamp}`,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      delay: delayMs, // Delay in milliseconds as specified in the docs
      // Add scheduledFor field which the worker uses to track metrics
      scheduledFor: new Date(now.getTime() + delayMs).toISOString(),
      // Include trackMetrics flag to ensure metrics are recorded
      trackMetrics: true,
      // Include additional fields that match what the metrics system expects
      metadata: {
        source: 'scheduled_sms_test',
        campaignId: randomUUID(),
        messageId: messageId,
        email: TEST_EMAIL,
        timestamp: timestamp,
        // Add callback information similar to email implementation
        callbackEndpoint: "/api/sms/callback",
        // Include tracking information for metrics
        tracking: {
          messageId: messageId,
          workspaceId: WORKSPACE_ID,
          contactId: TEST_CONTACT_ID,
          trackMetrics: true
        }
      }
    };
    
    console.log("Test data:", {
      phoneNumber: testData.phoneNumber,
      message: testData.message.substring(0, 30) + "...",
      contactId: testData.contactId,
      workspaceId: testData.workspaceId,
      delay: testData.delay,
      scheduledFor: testData.scheduledFor,
      trackMetrics: testData.trackMetrics
    });
    
    // Use the correct /api/schedule-sms endpoint as documented in instructions.md
    console.log(`Sending request to ${QUEUE_SERVICE_URL}/api/schedule-sms`);
    const response = await fetch(`${QUEUE_SERVICE_URL}/api/schedule-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add X-Workspace-ID header similar to email implementation
        'X-Workspace-ID': String(WORKSPACE_ID)
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
      console.log(`The message should be delivered in approximately ${delayMinutes} minutes`);
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
  console.log("\n=== Scheduled SMS Test Completed ===");
  console.log(`Successfully queued ${successCount} out of ${delayTimes.length} messages`);
  console.log("You should receive the SMS messages at their scheduled times.");
  
  // Calculate expected delivery times
  console.log("Expected delivery times:");
  delayTimes.forEach(delayMinutes => {
    const deliveryTime = new Date(now.getTime() + delayMinutes * 60000);
    console.log(`- ${delayMinutes} minute delay: ${deliveryTime.toISOString()}`);
  });
}

// Run the tests
runAllTests().catch(console.error);
