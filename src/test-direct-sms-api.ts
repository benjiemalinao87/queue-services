import fetch from "node-fetch";

// API configuration
const SMS_API_URL = "https://cc.automate8.com";
const SMS_ENDPOINT = "/send-sms";

// Test data
const testData = {
  to: "+16263133690", // Valid test phone number
  message: "This is a test SMS from direct API test",
  contactId: "5346834e-479f-4c5f-a53c-7bf97837fd68",
  workspaceId: "66338"
};

async function testSMSAPI() {
  console.log("=== Starting Direct SMS API Test ===");
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
    console.log("=== SMS API Test Completed Successfully ===");
  } catch (error) {
    console.error("Error during API test:", error);
  }
}

// Run the test
testSMSAPI();
