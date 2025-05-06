import { Queue, Worker } from "bullmq";
import { SMSData } from "./queues/schemas";
import { env } from "./env";
import fetch from "node-fetch";

// Railway proxy details for Redis connection
const RAILWAY_PROXY_HOST = "caboose.proxy.rlwy.net";
const RAILWAY_PROXY_PORT = 58064;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

// Connection configuration that works with our other tests
const connection = {
  host: RAILWAY_PROXY_HOST,
  port: RAILWAY_PROXY_PORT,
  password: REDIS_PASSWORD,
};

// Function to send SMS via the API
async function sendSMSViaAPI(data: SMSData) {
  const { phoneNumber, message, contactId, workspaceId, metadata } = data;
  
  console.log("Sending message via API:", {
    to: phoneNumber,
    message,
    contactId,
    workspaceId,
  });
  
  const response = await fetch(`${env.SMS_API_URL}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phoneNumber,
      message,
      contactId,
      workspaceId,
      ...(metadata || {}),
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    throw new Error(`SMS API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

async function testDelayedSMS() {
  console.log("=== Testing Delayed SMS ===");
  console.log("Current time:", new Date().toISOString());
  
  try {
    // Create a queue for the test
    const testQueue = new Queue("test-delayed-sms", { connection });
    
    console.log("Queue created successfully");
    
    // Create a worker to process the jobs
    const worker = new Worker("test-delayed-sms", async (job) => {
      console.log(`Processing job ${job.id}`);
      console.log("Job data:", job.data);
      
      try {
        // Send the SMS
        const result = await sendSMSViaAPI(job.data);
        console.log("SMS sent successfully:", result);
        return { success: true, result };
      } catch (error) {
        console.error("Error sending SMS:", error);
        throw error;
      }
    }, { connection });
    
    console.log("Worker created successfully");
    
    // Set up worker events
    worker.on('completed', (job) => {
      console.log(`Job ${job.id} has completed successfully`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} has failed with error ${err.message}`);
    });
    
    // Calculate time for 5 minutes from now
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 300000);
    
    console.log(`Scheduling SMS for: ${fiveMinutesFromNow.toISOString()}`);
    
    // Add a delayed job
    const job = await testQueue.add("delayed-sms", {
      phoneNumber: "+16263133690",
      message: "This is a test delayed SMS via BullMQ. Scheduled at: " + now.toISOString(),
      contactId: "5346834e-479f-4c5f-a53c-7bf97837fd68",
      workspaceId: "66338",
      metadata: {
        source: "test-delayed-sms",
        timestamp: now.toISOString()
      }
    }, {
      delay: 300000 // 5 minutes delay
    });
    
    console.log(`Successfully added delayed SMS job: ${job.id}`);
    console.log(`Job will be processed at approximately: ${fiveMinutesFromNow.toISOString()}`);
    
    // Keep the process running for 6 minutes to allow the job to be processed
    console.log("Waiting for the job to be processed (6 minutes)...");
    await new Promise(resolve => setTimeout(resolve, 360000));
    
    // Clean up
    console.log("Cleaning up...");
    await worker.close();
    await testQueue.close();
    
    console.log("=== Test Complete ===");
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Run the test
testDelayedSMS().catch(console.error);
