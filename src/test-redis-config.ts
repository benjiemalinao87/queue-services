import { createClient } from 'redis';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables or default values
const REDIS_HOST = process.env.REDIS_HOST || 'redis.railway.internal';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'fbYziATslDdWOVGqlpsXPZThAwbSzbgz';
const REDIS_USER = process.env.REDIS_USER || '';

// Railway proxy details
const RAILWAY_PROXY_HOST = 'caboose.proxy.rlwy.net';
const RAILWAY_PROXY_PORT = 58064;

// Function to test Redis connection with the provided configuration
async function testRedisConnection(host: string, port: number, username?: string, password?: string) {
  console.log(`\n=== Testing Redis Connection to ${host}:${port} ===`);
  
  const url = username && password 
    ? `redis://${username}:${password}@${host}:${port}` 
    : password 
      ? `redis://:${password}@${host}:${port}`
      : `redis://${host}:${port}`;
  
  console.log(`Connection URL: ${url.replace(/:[^:@]*@/, ':****@')}`);
  
  const client = createClient({
    url,
    socket: {
      connectTimeout: 5000, // 5 seconds timeout
      reconnectStrategy: false // Don't reconnect
    }
  });

  let errorCount = 0;
  const maxErrors = 3;
  
  client.on('error', (err) => {
    console.error(`Redis Client Error: ${err.message}`);
    errorCount++;
    
    if (errorCount >= maxErrors) {
      console.error(`Reached maximum error count (${maxErrors}). Stopping connection attempts.`);
      client.disconnect();
    }
  });

  try {
    const connectPromise = client.connect();
    
    // Add a timeout to the connection attempt
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log(`✅ Successfully connected to Redis at ${host}:${port}`);
    
    // Test basic Redis operations
    await client.set('test-key', 'Hello from test-redis-config.ts');
    const value = await client.get('test-key');
    console.log(`✅ Successfully set and retrieved test key: ${value}`);
    
    await client.quit();
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Redis at ${host}:${port}: ${error.message}`);
    try {
      await client.quit();
    } catch (e) {
      // Ignore errors on quit
    }
    return false;
  }
}

// Function to print environment variables (with password masked)
function printEnvVars() {
  console.log("\n=== Environment Variables ===");
  console.log(`REDIS_HOST: ${REDIS_HOST}`);
  console.log(`REDIS_PORT: ${REDIS_PORT}`);
  console.log(`REDIS_USER: ${REDIS_USER || '(not set)'}`);
  console.log(`REDIS_PASSWORD: ${REDIS_PASSWORD ? '****' : '(not set)'}`);
}

// Main function to run all tests
async function runTests() {
  console.log("=== Starting Redis Configuration Tests ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Print environment variables
  printEnvVars();
  
  // Test with Railway proxy (should work from anywhere)
  console.log("\n=== Testing with Railway Proxy ===");
  await testRedisConnection(RAILWAY_PROXY_HOST, RAILWAY_PROXY_PORT, REDIS_USER, REDIS_PASSWORD);
  
  // Test with redis.customerconnects.app
  await testRedisConnection('redis.customerconnects.app', 6379, REDIS_USER, REDIS_PASSWORD);
  
  // Test with redis-production-c503.up.railway.app
  await testRedisConnection('redis-production-c503.up.railway.app', 6379, REDIS_USER, REDIS_PASSWORD);
  
  // Test with environment variables
  await testRedisConnection(REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD);
  
  // Test with localhost
  await testRedisConnection('localhost', 6379);
  
  // Test with 127.0.0.1
  await testRedisConnection('127.0.0.1', 6379);
  
  console.log("\n=== Redis Configuration Tests Completed ===");
}

// Run all tests
runTests().catch(error => {
  console.error("Unhandled error during tests:", error);
});
