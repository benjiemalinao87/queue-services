// Test script to send MMS via the queue service API endpoint
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Configuration
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || "https://cc.automate8.com"; // Use the known base URL
const WORKSPACE_ID = '15213'; // Updated to user's workspace
const TEST_PHONE = '+16266635938'; // Updated to user's phone
const TEST_CONTACT_ID = '97241048-3d5f-4236-90c6-de499ccd6462'; // Updated to user's contact ID
const TEST_EMAIL = 'benjiemalinao87@gmail.com'; // Added user's email

// Get current time
const now = new Date();
const timestamp = now.toISOString();
console.log("=== Starting Queue MMS API Test ===");
console.log(`Current time: ${timestamp}`);

// Function to test sending an MMS via the queue API
async function testQueueMMS() {
  try {
    // Prepare the test data for the queue service API
    const testData = {
      to: TEST_PHONE,
      message: `This is a test MMS sent via queue service at: ${timestamp}`,
      contactId: TEST_CONTACT_ID,
      workspaceId: WORKSPACE_ID,
      delay: 0, // No delay - send immediately
      // Important: Include mediaUrl at the top level as well as in metadata
      // The backend expects mediaUrl directly in the data object
      mediaUrl: 'https://dfktvbot.s3.amazonaws.com/bot/team/90155/fhia-what-to-do-first-Xx6W.png',
      metadata: {
        // Include mediaUrl in metadata for redundancy
        mediaUrl: 'https://dfktvbot.s3.amazonaws.com/bot/team/90155/fhia-what-to-do-first-Xx6W.png',
        source: 'queue_service_test',
        campaignId: randomUUID(),
        messageId: randomUUID(),
        email: TEST_EMAIL,
        scheduledTime: timestamp,
        timestamp: timestamp
      }
    };
    
    console.log("Test data:", testData);
    
    // Send the request to the queue service API endpoint
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
      console.log(' MMS queued successfully!');
      console.log(`Job ID: ${result.jobId}`); // Success is verified by getting a job ID
    } else {
      console.error(' MMS queuing failed!');
    }
    
    console.log("=== Queue MMS API Test Completed ===");
    console.log("The MMS should be processed by the queue worker and sent via the queue system.");
    console.log("Check your phone for the message with image. It should arrive within seconds.");
    
  } catch (error) {
    console.error("Error in queue MMS test:", error);
  }
}

// Run the test
testQueueMMS().catch(console.error);
