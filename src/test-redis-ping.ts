import IORedis from "ioredis";

// Redis server details (using proxy)
const REDIS_HOST = "caboose.proxy.rlwy.net";
const REDIS_PORT = 58064;
const REDIS_PASSWORD = "fbYziATslDdWOVGqlpsXPZThAwbSzbgz";

async function testRedisPing() {
  console.log(`=== Testing Redis Connection to ${REDIS_HOST}:${REDIS_PORT} ===`);
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Create Redis client
  const redis = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    connectTimeout: 10000, // 10 seconds
    maxRetriesPerRequest: 3,
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
    
    // Try to set and get a value
    const testKey = `test-key-${Date.now()}`;
    const testValue = `test-value-${Date.now()}`;
    
    console.log(`Setting test key: ${testKey}`);
    await redis.set(testKey, testValue);
    
    console.log(`Getting test key: ${testKey}`);
    const retrievedValue = await redis.get(testKey);
    
    if (retrievedValue === testValue) {
      console.log(`✅ Successfully set and retrieved value: ${retrievedValue}`);
      console.log("Redis connection test successful!");
    } else {
      console.error(`❌ Value mismatch: expected ${testValue}, got ${retrievedValue}`);
    }
    
    // Clean up
    await redis.del(testKey);
    
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
