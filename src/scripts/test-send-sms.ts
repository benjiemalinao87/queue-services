import axios from "axios";
import { env } from "../env";

async function testSendSMS() {
  console.log("Testing SMS Sending Endpoint...");
  
  // Modify this with a real phone number to receive the test message
  const testPhoneNumber = "+YOUR_PHONE_NUMBER"; // Replace with a valid test number
  
  // Test payload for sending an SMS
  const smsPayload = {
    to: testPhoneNumber,
    message: "This is a test message from the Queue Service. Please disregard.",
    workspaceId: "15213",
    contactId: "test-contact-id",
    metadata: {
      source: "test",
      isTest: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log(`\nPreparing to send SMS to endpoint: ${env.SMS_API_URL}/send-sms`);
  console.log("SMS payload:", JSON.stringify(smsPayload, null, 2));
  
  // Ask for confirmation before sending
  console.log("\n⚠️ This will send an actual SMS message if the endpoint is properly configured.");
  console.log("To proceed, set the TEST_REAL_SMS environment variable to 'true' before running this script:");
  console.log("Example: TEST_REAL_SMS=true node dist/test-send-sms.js\n");
  
  if (process.env.TEST_REAL_SMS !== "true") {
    console.log("Skipping actual SMS send. Set TEST_REAL_SMS=true to send a real message.");
    return { 
      success: false, 
      reason: "TEST_REAL_SMS environment variable not set to true" 
    };
  }
  
  if (testPhoneNumber === "+YOUR_PHONE_NUMBER") {
    console.log("Please replace the placeholder phone number with a real one before testing.");
    return { 
      success: false, 
      reason: "Phone number not configured" 
    };
  }
  
  try {
    console.log("Sending SMS...");
    
    const response = await axios.post(
      `${env.SMS_API_URL}/send-sms`,
      smsPayload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("\nSMS sent successfully!");
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      response: response.data
    };
  } catch (error) {
    console.error("\nFailed to send SMS:");
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else {
      console.error("Unexpected error:", error);
    }
    
    throw error;
  }
}

// Run the test
testSendSMS()
  .then(result => {
    console.log("\nTest summary:", result.success ? "✅ Message sent" : "❌ Message not sent");
    console.log(result.success ? 
      "Check the provided phone number for the test message." : 
      `Reason: ${result.reason}`);
    process.exit(0);
  })
  .catch(err => {
    console.error("\nTest failed with error:", err.message);
    process.exit(1);
  }); 