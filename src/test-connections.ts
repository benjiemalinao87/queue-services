import { Queue } from 'bullmq';
import axios from 'axios';
import { createClient } from 'redis';

// Define different connection configurations to test
const connectionConfigs = [
  {
    name: "Railway Redis (Internal)",
    config: {
      host: 'redis.railway.internal',
      port: 6379,
      username: 'default',
      password: 'fbYziATslDdWOVGqlpsXPZThAwbSzbgz',
    }
  },
  {
    name: "Customer Connects Redis",
    config: {
      host: 'redis.customerconnects.app',
      port: 6379,
      username: 'default',
      password: 'fbYziATslDdWOVGqlpsXPZThAwbSzbgz',
    }
  },
  {
    name: "Railway Redis URL",
    config: {
      url: 'redis://default:fbYziATslDdWOVGqlpsXPZThAwbSzbgz@redis.railway.internal:6379'
    }
  },
  {
    name: "Customer Connects Redis URL",
    config: {
      url: 'redis://default:fbYziATslDdWOVGqlpsXPZThAwbSzbgz@redis.customerconnects.app:6379'
    }
  }
];

// Test Bull Board UI
async function testBullBoardUI() {
  console.log("\n=== Testing Bull Board UI ===");
  try {
    const response = await axios.get('https://queue-services-production.up.railway.app/ui', {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    console.log(`✅ Successfully connected to Bull Board UI (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Bull Board UI: ${error.message}`);
    return false;
  }
}

// Test Redis connection directly
async function testRedisConnection(name: string, config: any) {
  console.log(`\n=== Testing Redis Connection: ${name} ===`);
  
  const client = createClient(config);
  
  try {
    client.on('error', (err) => {
      console.error(`Redis Client Error: ${err.message}`);
    });
    
    await client.connect();
    console.log(`✅ Successfully connected to Redis using ${name}`);
    
    // Try to ping the server
    const pingResult = await client.ping();
    console.log(`✅ Redis PING result: ${pingResult}`);
    
    // Try to get server info
    const info = await client.info();
    console.log(`✅ Redis server info retrieved (${info.length} bytes)`);
    
    await client.disconnect();
    console.log(`✅ Successfully disconnected from Redis`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Redis using ${name}: ${error.message}`);
    try {
      await client.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    return false;
  }
}

// Test BullMQ connection
async function testBullMQConnection(name: string, config: any) {
  console.log(`\n=== Testing BullMQ Connection: ${name} ===`);
  
  // Create queue instances
  const myQueue = new Queue('my-queue', { connection: config });
  
  try {
    // Add a test job
    const job = await myQueue.add('connection-test', {
      test: true,
      timestamp: new Date().toISOString(),
      connectionName: name
    });
    console.log(`✅ Successfully added job to myQueue with ID: ${job.id}`);
    
    // Close the queue
    await myQueue.close();
    console.log(`✅ Successfully closed queue connection`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to add job using ${name}: ${error.message}`);
    try {
      await myQueue.close();
    } catch (e) {
      // Ignore close errors
    }
    return false;
  }
}

async function runTests() {
  console.log("=== Starting Connection Tests ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Test Bull Board UI
  await testBullBoardUI();
  
  // Test each connection configuration
  for (const { name, config } of connectionConfigs) {
    // Test direct Redis connection
    const redisSuccess = await testRedisConnection(name, config);
    
    // Only test BullMQ if Redis connection was successful
    if (redisSuccess) {
      await testBullMQConnection(name, config);
    }
  }
  
  console.log("\n=== Connection Tests Completed ===");
}

// Run all tests
runTests().catch(error => {
  console.error("Unhandled error during tests:", error);
});
