import axios from "axios";
import { env } from "../env";

async function testAiFlowWithMock() {
  console.log("Testing AI Flow with Mock Data...");
  
  // Sample data from pending record
  const pendingJob = {
    id: "b27cc0bc-2ef4-433e-88c6-685aab893abd",
    workspace_id: "15213",
    contact_id: "fc7b218e-ce7c-4317-8555-b62a91772598",
    message_id: "48f591e3-af1c-4751-a949-a2076feb31d2",
    status: "pending",
    created_at: "2025-04-26T17:12:03.070748+00:00",
    processed_at: null,
    error: null,
    attempts: 0
  };
  
  // Step 1: Log pending job we'd process
  console.log("Starting to process job:", pendingJob.id);
  
  // Step 2: Mock expected response from /api/ai/generate-response
  console.log("\n[MOCK] Calling AI Generate Response API...");
  // This would normally be:
  // const aiResponse = await axios.post(`${env.SMS_API_URL}/api/ai/generate-response`, {...})
  
  // Instead, we'll create a mock response
  const mockAiResponse = {
    success: true,
    response: "This is a mock AI-generated response. Thank you for your message!",
    logId: "mock-log-" + Date.now(),
    model: "gpt-4o",
    tokens: 150,
    contact: {
      id: pendingJob.contact_id,
      phone: "+1234567890" // Mock phone number
    }
  };
  
  console.log("[MOCK] AI Generate Response:", JSON.stringify(mockAiResponse, null, 2));
  
  // Step 3: Mock sending the SMS
  console.log("\n[MOCK] Sending SMS with generated response...");
  
  const smsPayload = {
    to: mockAiResponse.contact.phone,
    message: mockAiResponse.response,
    workspaceId: pendingJob.workspace_id,
    contactId: pendingJob.contact_id,
    metadata: {
      contactId: pendingJob.contact_id,
      isAiGenerated: true,
      aiLogId: mockAiResponse.logId
    }
  };
  
  console.log("[MOCK] SMS payload:", JSON.stringify(smsPayload, null, 2));
  
  // This would normally be:
  // const smsResponse = await axios.post(`${env.SMS_API_URL}/send-sms`, smsPayload, {...})
  
  // Instead, we'll create a mock SMS response
  const mockSmsResponse = {
    success: true,
    messageId: "mock-sms-" + Date.now(),
    sid: "SM" + Date.now(),
    status: "queued"
  };
  
  console.log("[MOCK] SMS Response:", JSON.stringify(mockSmsResponse, null, 2));
  
  // Step 4: Mock updating job status to complete
  console.log("\n[MOCK] Updating job status to complete...");
  // This would normally be:
  // await supabase.from("ai_response_queue").update({status: "complete", processed_at: new Date().toISOString()}).eq("id", pendingJob.id)
  
  const updatedJob = {
    ...pendingJob,
    status: "complete",
    processed_at: new Date().toISOString(),
    attempts: 1
  };
  
  console.log("[MOCK] Updated job:", JSON.stringify(updatedJob, null, 2));
  
  // Step 5: Test actual SMS endpoint if we want to verify the actual endpoint
  if (process.env.TEST_REAL_SMS === "true") {
    try {
      console.log("\n[REAL] Testing actual SMS endpoint...");
      console.log(`Calling ${env.SMS_API_URL}/send-sms with test message...`);
      
      // Use a safe test message and your own phone for testing
      const testSmsPayload = {
        to: "+YOUR_PHONE_NUMBER", // Replace with your phone or a test number
        message: "This is a test message from the queue service.",
        workspaceId: "15213",
        contactId: "test-contact-id",
        metadata: {
          source: "test",
          isTest: true
        }
      };
      
      console.log("[REAL] SMS payload:", JSON.stringify(testSmsPayload, null, 2));
      
      // This is commented out by default - uncomment to actually test the SMS endpoint
      /*
      const realSmsResponse = await axios.post(
        `${env.SMS_API_URL}/send-sms`,
        testSmsPayload,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("[REAL] SMS Response:", JSON.stringify(realSmsResponse.data, null, 2));
      */
      
      console.log("[REAL] SMS test skipped. Uncomment code to actually send test SMS.");
    } catch (error) {
      console.error("[REAL] SMS test error:", error);
    }
  }
  
  console.log("\nMock flow test completed successfully.");
  return {
    success: true,
    aiResponse: mockAiResponse,
    smsResponse: mockSmsResponse,
    updatedJob
  };
}

// Run the test
testAiFlowWithMock()
  .then(result => {
    console.log("\nTest summary:", result.success ? "✅ Passed" : "❌ Failed");
    process.exit(0);
  })
  .catch(err => {
    console.error("\nTest failed:", err.message);
    process.exit(1);
  }); 