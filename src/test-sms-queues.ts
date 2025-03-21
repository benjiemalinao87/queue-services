import { Queue } from "bullmq";
import { createClient } from "redis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Railway proxy details
const RAILWAY_PROXY_HOST = "caboose.proxy.rlwy.net";
const RAILWAY_PROXY_PORT = 58064;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

// Connection options for BullMQ
const connection = {
  host: RAILWAY_PROXY_HOST,
  port: RAILWAY_PROXY_PORT,
  password: REDIS_PASSWORD,
};

// Function to test SMS queues
async function testSMSQueues() {
  console.log("\n=== Testing SMS Queues ===");
  
  try {
    // Create queues with the connection options
    const sendSMSQueue = new Queue("send-sms-queue", { connection });
    const scheduledSMSQueue = new Queue("scheduled-sms-queue", { connection });
    
    console.log("✅ Successfully created SMS queues");
    
    // Add a regular SMS job
    const regularSMS = {
      phoneNumber: "+1234567890",
      message: "This is a test SMS sent via the Railway proxy.",
    };
    
    const regularJob = await sendSMSQueue.add("send-sms", regularSMS);
    console.log(`✅ Successfully added regular SMS job:`, regularJob.id);
    
    // Add a scheduled SMS job (delayed by 60 seconds)
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 60000); // 60 seconds from now
    
    const scheduledSMS = {
      phoneNumber: "+1234567890",
      message: "This is a scheduled SMS sent via the Railway proxy.",
      scheduledFor: scheduledTime.toISOString(),
    };
    
    const scheduledJob = await scheduledSMSQueue.add("scheduled-sms", scheduledSMS, {
      delay: 60000, // 60 seconds
    });
    console.log(`✅ Successfully added scheduled SMS job (will run in 60 seconds):`, scheduledJob.id);
    
    // Get job counts
    const sendSMSCounts = await sendSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    console.log(`Send SMS Queue job counts:`, sendSMSCounts);
    
    const scheduledSMSCounts = await scheduledSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    console.log(`Scheduled SMS Queue job counts:`, scheduledSMSCounts);
    
    // Close the queues
    await sendSMSQueue.close();
    await scheduledSMSQueue.close();
    console.log("✅ Successfully closed SMS queues");
    
    return true;
  } catch (error) {
    console.error("❌ Error testing SMS queues:", error);
    return false;
  }
}

// Function to test Redis connection directly
async function testRedisConnection() {
  console.log("\n=== Testing Direct Redis Connection via Proxy ===");
  
  const client = createClient({
    url: `redis://:${REDIS_PASSWORD}@${RAILWAY_PROXY_HOST}:${RAILWAY_PROXY_PORT}`,
    socket: {
      connectTimeout: 5000, // 5 seconds timeout
    },
  });
  
  client.on("error", (err) => {
    console.error(`Redis Client Error:`, err);
  });
  
  try {
    await client.connect();
    console.log(`✅ Successfully connected to Redis via proxy`);
    
    // Get queue-related keys
    const queueKeys = await client.keys("bull:*");
    console.log(`Queue-related keys:`, queueKeys);
    
    await client.quit();
    console.log(`✅ Successfully closed Redis connection`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Redis via proxy:`, error);
    try {
      await client.quit();
    } catch (e) {
      // Ignore errors on quit
    }
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  console.log("=== Starting SMS Queue Tests ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Test Redis connection
  const redisConnected = await testRedisConnection();
  
  if (redisConnected) {
    // Test SMS queues
    await testSMSQueues();
  }
  
  console.log("\n=== SMS Queue Tests Completed ===");
  console.log("You can check the Bull Board UI to see the jobs that were added.");
}

// Run all tests
runTests().catch((error) => {
  console.error("Unhandled error during tests:", error);
});
