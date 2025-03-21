import IORedis from "ioredis";

// Redis connection URL
const REDIS_URL = "redis://default:fbYziATslDdWOVGqlpsXPZThAwbSzbgz@caboose.proxy.rlwy.net:58064";

async function testRedisPing() {
  console.log(`=== Testing Redis Connection to ${REDIS_URL} ===`);
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Create Redis client using URL
  const redis = new IORedis(REDIS_URL);
  
  // Set up event handlers
  redis.on("connect", () => {
    console.log(`✅ Connected to Redis`);
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
