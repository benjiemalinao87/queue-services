// Direct MMS test script that matches the successful curl command
import fetch from 'node-fetch';

// Configuration - using exact parameters from the successful curl command
const API_URL = 'https://cc.automate8.com';
const API_ENDPOINT = '/api/preview/send-sms';
const TEST_PHONE = '+16267888830';
const WORKSPACE_ID = '66338';
const TEST_CONTACT_ID = '2d3f28ca-1cd5-4d41-89bb-04b605401e72';

// Get current time
const now = new Date();
const timestamp = now.toISOString();
console.log("=== Starting Direct MMS API Test ===");
console.log(`Current time: ${timestamp}`);

// Function to test sending an MMS directly to the API
async function testDirectMMS() {
  try {
    // Prepare the test data exactly matching the successful curl command
    const testData = {
      phoneNumber: TEST_PHONE,
      workspaceId: WORKSPACE_ID,
      contactId: TEST_CONTACT_ID,
      previewText: `This is a direct MMS test with image at: ${timestamp}`,
      mediaUrl: 'https://dfktvbot.s3.amazonaws.com/bot/team/90155/fhia-what-to-do-first-Xx6W.png'
    };
    
    console.log("Test data:", testData);
    
    // Send the request directly to the API endpoint
    console.log(`Sending request to ${API_URL}${API_ENDPOINT}`);
    const response = await fetch(`${API_URL}${API_ENDPOINT}`, {
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
      console.log('✅ MMS sent successfully!');
      if (result.messageSid) {
        console.log(`Message SID: ${result.messageSid}`);
      }
    } else {
      console.error('❌ MMS sending failed!');
    }
    
    console.log("=== Direct MMS API Test Completed ===");
    console.log("Check your phone for the message with image. It should arrive within seconds.");
    
  } catch (error) {
    console.error("Error in direct MMS test:", error);
  }
}

// Run the test
testDirectMMS().catch(console.error);
