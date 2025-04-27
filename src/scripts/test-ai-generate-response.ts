import axios from "axios";
import { env } from "../env";

async function testAiGenerateResponse() {
  console.log("Testing AI Generate Response API...");
  
  // Sample data from the pending record we found
  const testData = {
    workspace_id: "15213",
    contact_id: "fc7b218e-ce7c-4317-8555-b62a91772598",
    message_id: "48f591e3-af1c-4751-a949-a2076feb31d2"
  };
  
  try {
    console.log(`Calling ${env.SMS_API_URL}/api/ai/generate-response with data:`, testData);
    
    const response = await axios.post(
      `${env.SMS_API_URL}/api/ai/generate-response`,
      testData,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
    
    // Check if response has expected fields
    if (response.data) {
      console.log("\nResponse validation:");
      
      const expectedFields = ["success", "response", "logId", "model", "tokens", "contact"];
      expectedFields.forEach(field => {
        console.log(`- ${field}: ${response.data[field] !== undefined ? "✅ Present" : "❌ Missing"}`);
      });
      
      // Check contact object if present
      if (response.data.contact) {
        console.log("\nContact validation:");
        const contactFields = ["id", "phone"];
        contactFields.forEach(field => {
          console.log(`- contact.${field}: ${response.data.contact[field] !== undefined ? "✅ Present" : "❌ Missing"}`);
        });
      }
    }
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API request failed:");
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    } else {
      console.error("Unexpected error:", error);
    }
    throw error;
  }
}

// Run the test
testAiGenerateResponse()
  .then(() => {
    console.log("\nTest completed successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("\nTest failed:", err.message);
    process.exit(1);
  }); 