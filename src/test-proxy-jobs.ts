import { Queue } from 'bullmq';
import { createClient } from 'redis';

// Railway proxy details
const RAILWAY_PROXY_HOST = 'caboose.proxy.rlwy.net';
const RAILWAY_PROXY_PORT = 58064;
const REDIS_PASSWORD = 'fbYziATslDdWOVGqlpsXPZThAwbSzbgz';

// Connection options for BullMQ
const connection = {
  host: RAILWAY_PROXY_HOST,
  port: RAILWAY_PROXY_PORT,
  password: REDIS_PASSWORD
};

// Function to test a queue by adding jobs
async function testQueue(queueName: string, jobData: any) {
  console.log(`\n=== Testing Queue: ${queueName} ===`);
  
  try {
    // Create a queue with the connection options
    const queue = new Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
    
    console.log(`✅ Successfully created queue: ${queueName}`);
    
    // Add a regular job
    const regularJob = await queue.add('regular-job', jobData);
    console.log(`✅ Successfully added regular job to ${queueName}:`, regularJob.id);
    
    // Add a scheduled job (delayed by 60 seconds)
    const scheduledJob = await queue.add('scheduled-job', jobData, {
      delay: 60000 // 60 seconds
    });
    console.log(`✅ Successfully added scheduled job to ${queueName} (will run in 60 seconds):`, scheduledJob.id);
    
    // Get job counts
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    console.log(`Queue ${queueName} job counts:`, counts);
    
    // Close the queue
    await queue.close();
    console.log(`✅ Successfully closed queue: ${queueName}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error testing queue ${queueName}:`, error);
    return false;
  }
}

// Function to test Redis connection directly
async function testRedisConnection() {
  console.log("\n=== Testing Direct Redis Connection via Proxy ===");
  
  const client = createClient({
    url: `redis://:${REDIS_PASSWORD}@${RAILWAY_PROXY_HOST}:${RAILWAY_PROXY_PORT}`,
    socket: {
      connectTimeout: 5000 // 5 seconds timeout
    }
  });
  
  client.on('error', (err) => {
    console.error(`Redis Client Error:`, err);
  });
  
  try {
    await client.connect();
    console.log(`✅ Successfully connected to Redis via proxy`);
    
    // Test basic Redis operations
    await client.set('test-key', 'Hello from test-proxy-jobs.ts');
    const value = await client.get('test-key');
    console.log(`✅ Successfully set and retrieved test key: ${value}`);
    
    // List all keys (useful for debugging)
    const keys = await client.keys('*');
    console.log(`Redis keys (first 10):`, keys.slice(0, 10));
    
    // Get queue-related keys
    const queueKeys = await client.keys('*queue*');
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
  console.log("=== Starting Proxy Jobs Tests ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Test Redis connection
  const redisConnected = await testRedisConnection();
  
  if (redisConnected) {
    // Test my-queue
    await testQueue('my-queue', {
      data: "This is a test job for my-queue",
      timestamp: new Date().toISOString()
    });
    
    // Test send-email-queue
    await testQueue('send-email-queue', {
      email: "test@example.com",
      subject: "Test Email via Proxy",
      text: "This is a test email sent via the Railway proxy."
    });
  }
  
  console.log("\n=== Proxy Jobs Tests Completed ===");
  console.log("You can check the Bull Board UI to see the jobs that were added.");
}

// Run all tests
runTests().catch(error => {
  console.error("Unhandled error during tests:", error);
});
