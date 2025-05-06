// Test script to send scheduled emails via the queue service using correct endpoint
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Configuration
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || "https://secivres-eueuq.customerconnects.app";
const WORKSPACE_ID = '15213';
const TEST_EMAIL = 'benjiemalinao87@gmail.com';
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462';

// Current time
const now = new Date();
const timestamp = now.toISOString();

console.log("=== Starting Properly Configured Scheduled Email Test ===");
console.log(`Current time: ${timestamp}`);

// Delay times in minutes
const delayTimes = [1, 2, 3, 5];

// Function to test sending scheduled email with a specific delay
async function testScheduledEmail(delayMinutes) {
  try {
    // Calculate delay in milliseconds
    const delayMs = delayMinutes * 60000;
    
    console.log(`\n--- Testing ${delayMinutes} minute delay (${delayMs}ms) ---`);
    
    // Create a unique subject for easy identification
    const subject = `Test Scheduled Email (${delayMinutes}min delay) - ${randomUUID().substring(0, 8)}`;
    
    // Prepare the test data for scheduled email - using the format from instructions.md
    const testData = {
      to: TEST_EMAIL,
      subject: subject,
      html: `
        <h1>This is a scheduled test email</h1>
        <p>This email was queued at: ${timestamp}</p>
        <p>It was scheduled with a ${delayMinutes} minute delay (${delayMs}ms)</p>
        <p>You should receive it at approximately ${new Date(now.getTime() + delayMs).toISOString()}</p>
        <p>Test ID: ${randomUUID()}</p>
      `,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      delay: delayMs, // Delay in milliseconds as specified in the docs
      metadata: {
        source: 'scheduled_email_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        timestamp: timestamp,
        delayMinutes: delayMinutes
      }
    };
    
    console.log("Test data:", {
      to: testData.to,
      subject: testData.subject,
      contactId: testData.contactId,
      workspaceId: testData.workspaceId,
      delay: testData.delay
    });
    
    // Use the correct /api/schedule-email endpoint as documented in instructions.md
    console.log(`Sending request to ${QUEUE_SERVICE_URL}/api/schedule-email`);
    const response = await fetch(`${QUEUE_SERVICE_URL}/api/schedule-email`, {
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
      console.log(`✅ Scheduled Email with ${delayMinutes} minute delay queued successfully!`);
      console.log(`Job ID: ${result.jobId || 'N/A'}`);
      console.log(`The email should be delivered in approximately ${delayMinutes} minutes`);
      return true;
    } else {
      console.error(`❌ Scheduled Email with ${delayMinutes} minute delay queuing failed!`);
      return false;
    }
  } catch (error) {
    console.error(`Error in scheduled email test with ${delayMinutes} minute delay:`, error);
    return false;
  }
}

// Run all tests sequentially
async function runAllTests() {
  console.log(`Will send ${delayTimes.length} scheduled emails with delays: ${delayTimes.join(', ')} minutes`);
  
  let successCount = 0;
  
  // Process each delay time sequentially
  for (const delayMinutes of delayTimes) {
    const success = await testScheduledEmail(delayMinutes);
    if (success) successCount++;
    
    // Add a small delay between API calls to avoid rate limiting
    if (delayMinutes !== delayTimes[delayTimes.length - 1]) {
      console.log("Waiting 2 seconds before sending next email...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log("\n=== Scheduled Email Test Completed ===");
  console.log(`Successfully queued ${successCount} out of ${delayTimes.length} emails`);
  console.log("You should receive the emails at their scheduled times.");
  
  // Calculate expected delivery times
  console.log("Expected delivery times:");
  delayTimes.forEach(delayMinutes => {
    const deliveryTime = new Date(now.getTime() + delayMinutes * 60000);
    console.log(`- ${delayMinutes} minute delay: ${deliveryTime.toISOString()}`);
  });
}

// Run the tests
runAllTests().catch(console.error);
