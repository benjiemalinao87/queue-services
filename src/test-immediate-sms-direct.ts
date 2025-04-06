import fetch from "node-fetch";

// API configuration
const SMS_API_URL = "https://cc.automate8.com";
const SMS_ENDPOINT = "/send-sms";

// Test data with the provided phone number and workspace ID
const testData = {
  to: "+16266635938", // User's phone number
  message: "This is a test immediate SMS sent at: " + new Date().toISOString(),
  contactId: "test-contact-id", // Using a test contact ID
  workspaceId: "66338" // Using the provided workspace ID
};

async function testImmediateSMSAPI() {
  console.log("=== Starting Immediate SMS API Test ===");
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
    console.log("=== Immediate SMS API Test Completed Successfully ===");
    console.log("Check your phone for the immediate SMS. It should arrive within seconds.");
  } catch (error) {
    console.error("Error during API test:", error);
  }
}

// Run the test
testImmediateSMSAPI();
