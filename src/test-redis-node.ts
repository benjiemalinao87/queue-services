import { createClient } from 'redis';

async function testRedisConnection() {
  console.log('=== Testing Redis Connection with node-redis ===');
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Create a Redis client
  const client = createClient({
    url: 'redis://redis.customerconnects.app:6379',
    socket: {
      connectTimeout: 10000, // 10 seconds
      reconnectStrategy: (retries) => {
        console.log(`Retry attempt ${retries}`);
        return Math.min(retries * 100, 3000); // Exponential backoff
      }
    }
  });
  
  // Set up event handlers
  client.on('connect', () => {
    console.log('✅ Connected to Redis');
  });
  
  client.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });
  
  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await client.connect();
    
    // Try to ping Redis
    console.log('Attempting to ping Redis...');
    const pingResult = await client.ping();
    console.log(`✅ Redis ping result: ${pingResult}`);
    
    // List keys to verify we're connected to the right Redis
    console.log('Listing keys (first 10):');
    const keys = await client.keys('*');
    console.log(keys.slice(0, 10));
    
  } catch (error) {
    console.error('❌ Error testing Redis connection:', error);
  } finally {
    // Always disconnect
    await client.disconnect();
    console.log('Redis connection closed');
  }
}

// Run the test
testRedisConnection().catch(console.error);
