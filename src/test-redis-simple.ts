import IORedis from "ioredis";

// Redis server details - using the server we can see is up
const REDIS_HOST = "redis.customerconnects.app";
const REDIS_PORT = 6379;

async function testRedisPing() {
  console.log(`=== Testing Redis Connection to ${REDIS_HOST}:${REDIS_PORT} ===`);
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Create Redis client with minimal configuration
  const redis = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    connectTimeout: 10000, // 10 seconds
    retryStrategy: (times) => {
      console.log(`Retry attempt ${times}`);
      return Math.min(times * 100, 3000); // Exponential backoff
    }
  });
  
  // Set up event handlers
  redis.on("connect", () => {
    console.log(`✅ Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  });
  
  redis.on("error", (err) => {
    console.error(`❌ Redis error:`, err.message);
  });
  
  try {
    // Try to ping Redis
    console.log("Attempting to ping Redis...");
    const pingResult = await redis.ping();
    console.log(`✅ Redis ping result: ${pingResult}`);
    
    // List keys to verify we're connected to the right Redis
    console.log("Listing keys (first 10):");
    const keys = await redis.keys("*");
    console.log(keys.slice(0, 10));
    
  } catch (error) {
    console.error(`❌ Error testing Redis connection:`, error);
  } finally {
    // Always disconnect
    redis.disconnect();
    console.log("Redis connection closed");
  }
}

// Run the test
testRedisPing().catch(console.error);
