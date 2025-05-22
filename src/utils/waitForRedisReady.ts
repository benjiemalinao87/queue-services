import IORedis from 'ioredis';
import { env } from '@/env';
import type { RedisOptions } from 'ioredis';

const MAX_RETRIES = 30; // Maximum number of retries
const INITIAL_DELAY = 1000; // Start with 1 second delay
const MAX_DELAY = 10000; // Maximum delay of 10 seconds

export async function waitForRedisReady(): Promise<boolean> {
  console.log('Waiting for Redis to be ready...');
  
  const redisOptions: RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USER,
    password: env.REDIS_PASSWORD,
    lazyConnect: true, // Don't connect immediately
    retryStrategy: () => null, // We'll handle retries ourselves
    connectTimeout: 5000, // 5 second timeout for each connection attempt
  };
  
  const redis = new IORedis(redisOptions);

  let retries = 0;
  let currentDelay = INITIAL_DELAY;

  while (retries < MAX_RETRIES) {
    try {
      // Try to connect if not connected
      if (!redis.status || redis.status === 'wait' || redis.status === 'reconnecting') {
        await redis.connect();
      }

      // Try to ping Redis
      const pong = await redis.ping();
      if (pong === 'PONG') {
        console.log('✅ Redis is ready!');
        await redis.disconnect();
        return true;
      }
    } catch (error) {
      retries++;
      
      if (retries === MAX_RETRIES) {
        console.error('❌ Max retries reached waiting for Redis');
        await redis.disconnect();
        return false;
      }

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * 1.5, MAX_DELAY);
      
      console.log(`Retry ${retries}/${MAX_RETRIES}: Redis not ready yet. Waiting ${currentDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  await redis.disconnect();
  return false;
} 