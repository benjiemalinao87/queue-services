// Simple script to test sending an immediate SMS/MMS
// This script can be run directly with Node.js without requiring a build step

import fetch from 'node-fetch';

// API configuration
const SMS_API_URL = "https://cc.automate8.com";
const SMS_ENDPOINT = "/api/preview/send-sms"; // Updated endpoint for MMS support

// Test data with the provided phone number, workspace ID, and media URL
const testData = {
  phoneNumber: "+16267888830", // Updated phone number in E.164 format
  workspaceId: "66338", // Using the provided workspace ID
  previewText: "This is a test MMS with image sent at: " + new Date().toISOString(),
  mediaUrl: "https://api.robolly.com/templates/66ee05c3a68f3f7e6f890661/render.jpg" // Image URL
};

async function testImmediateMMS() {
  console.log("=== Starting Immediate MMS API Test ===");
  console.log("Current time:", new Date().toISOString());
  console.log("Test data:", testData);
  
  try {
    console.log(`Sending request to ${SMS_API_URL}${SMS_ENDPOINT}`);
    
    const response = await fetch(`${SMS_API_URL}${SMS_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testData)
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return;
    }
    
    const result = await response.json();
    console.log("API Response:", result);
    console.log("=== Immediate MMS API Test Completed Successfully ===");
    console.log("Check your phone for the immediate MMS with image. It should arrive within seconds.");
  } catch (error) {
    console.error("Error during API test:", error);
  }
}

// Run the test
testImmediateMMS();
