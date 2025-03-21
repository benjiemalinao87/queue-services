import { Queue } from "bullmq";
import IORedis from "ioredis";

// Different connection options to try
const connectionOptions = [
  {
    name: "Public URL",
    connection: {
      host: "redis-production-c503.up.railway.app",
      port: 6379,
      password: "fbYziATslDdWOVGqlpsXPZThAwbSzbgz",
      connectTimeout: 30000, // Increase timeout to 30 seconds
      maxRetriesPerRequest: 5,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    }
  },
  {
    name: "Proxy URL",
    connection: {
      host: "caboose.proxy.rlwy.net",
      port: 58064,
      password: "fbYziATslDdWOVGqlpsXPZThAwbSzbgz",
      connectTimeout: 30000,
      maxRetriesPerRequest: 5,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    }
  }
];

async function testConnection(options: any) {
  console.log(`\n=== Testing connection: ${options.name} ===`);
  console.log("Connection details:", {
    host: options.connection.host,
    port: options.connection.port,
    password: "******" // Hide password
  });
  
  const redis = new IORedis(options.connection);
  
  // Set up event handlers
  redis.on("connect", () => {
    console.log(`✅ Connected to Redis (${options.name})`);
  });
  
  redis.on("error", (err) => {
    console.error(`❌ Redis error (${options.name}):`, err.message);
  });
  
  try {
    // Try to ping Redis
    console.log("Attempting to ping Redis...");
    const pingResult = await redis.ping();
    console.log(`✅ Redis ping result: ${pingResult}`);
    
    // Try to set and get a value
    const testKey = `test-key-${Date.now()}`;
    const testValue = `test-value-${Date.now()}`;
    
    console.log(`Setting test key: ${testKey}`);
    await redis.set(testKey, testValue);
    
    console.log(`Getting test key: ${testKey}`);
    const retrievedValue = await redis.get(testKey);
    
    if (retrievedValue === testValue) {
      console.log(`✅ Successfully set and retrieved value: ${retrievedValue}`);
      
      // Try to create a queue
      console.log("Creating test queue...");
      const testQueue = new Queue("test-queue", { 
        connection: options.connection
      });
      
      // Add a test job
      console.log("Adding test job to queue...");
      const job = await testQueue.add("test-job", { 
        test: true, 
        timestamp: Date.now() 
      });
      
      console.log(`✅ Successfully added job to queue: ${job.id}`);
      
      // Get job counts
      const counts = await testQueue.getJobCounts();
      console.log("Queue job counts:", counts);
      
      // Clean up
      console.log("Cleaning up...");
      await redis.del(testKey);
      await testQueue.close();
      
      console.log(`✅ Connection test successful for ${options.name}`);
      return true;
    } else {
      console.error(`❌ Value mismatch: expected ${testValue}, got ${retrievedValue}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error testing connection (${options.name}):`, error);
    return false;
  } finally {
    // Always disconnect
    redis.disconnect();
  }
}

async function runTests() {
  console.log("=== Testing Railway Redis Connection Options ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  let successfulConnection = null;
  
  for (const options of connectionOptions) {
    const success = await testConnection(options);
    if (success) {
      successfulConnection = options;
      console.log(`\n✅ Found working connection: ${options.name}`);
      break;
    }
  }
  
  if (successfulConnection) {
    console.log("\n=== Testing Delayed SMS with Working Connection ===");
    
    // Use the successful connection for the SMS test
    const connection = successfulConnection.connection;
    
    try {
      // Create a queue for testing
      const testSMSQueue = new Queue("test-delayed-sms", { connection });
      
      // Calculate time for 1 minute from now
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
      
      console.log(`Scheduling SMS for: ${oneMinuteFromNow.toISOString()}`);
      
      // Add a delayed job
      const job = await testSMSQueue.add("delayed-sms", {
        to: "+16263133690",
        message: "This is a test delayed SMS via BullMQ. Scheduled at: " + now.toISOString(),
        contactId: "5346834e-479f-4c5f-a53c-7bf97837fd68",
        workspaceId: "66338",
        timestamp: now.toISOString()
      }, {
        delay: 60000 // 1 minute delay
      });
      
      console.log(`✅ Successfully added delayed SMS job: ${job.id}`);
      console.log(`Job will be processed at approximately: ${oneMinuteFromNow.toISOString()}`);
      
      // Get job counts
      const counts = await testSMSQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
      console.log("Queue job counts:", counts);
      
      // Clean up
      await testSMSQueue.close();
      
    } catch (error) {
      console.error("❌ Error testing delayed SMS:", error);
    }
  } else {
    console.error("\n❌ No working connection found for Railway Redis");
  }
  
  console.log("\n=== Test Complete ===");
}

// Run the tests
runTests().catch(console.error);
