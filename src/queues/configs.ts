import type {
  ConnectionOptions,
  DefaultJobOptions,
  QueueOptions,
  WorkerOptions,
  JobsOptions,
} from "bullmq";
import { env } from "@/env";

// Railway proxy details (for local development and testing)
const RAILWAY_PROXY_HOST = 'caboose.proxy.rlwy.net';
const RAILWAY_PROXY_PORT = 58064;

// Determine which connection to use based on environment
const isLocalDev = env.NODE_ENV === 'development';

// Common connection options for better error handling and memory optimization
const commonOptions = {
  enableReadyCheck: false, // Reduce overhead by disabling ready check
  maxRetriesPerRequest: 3, // Reduced from 5 to reduce memory overhead
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000); // Increase delay with each retry, max 3s
    if (times < 3) { // Only log initial retries to reduce log spam
      console.log(`Redis connection retry attempt ${times} with delay ${delay}ms`);
    }
    return delay;
  },
  connectTimeout: 5000, // Reduced from 10000 to 5000ms
  disconnectTimeout: 5000, // Reduced from 10000 to 5000ms
  commandTimeout: 5000, // Reduced from 10000 to 5000ms
  family: 4, // Use IPv4 only to reduce lookup time
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect for READONLY errors
    }
    return false;
  },
  // Add memory optimization settings
  keyPrefix: '', // Don't use prefix to save memory
  showFriendlyErrorStack: false, // Disable friendly error stack in production
  maxLoadingRetryTime: 2000, // Limit retry time
  autoResubscribe: false, // Disable auto resubscribe to reduce background operations
  autoResendUnfulfilledCommands: false, // Disable auto resend to reduce memory usage
  lazyConnect: true, // Connect only when needed
};

// Use the proxy for local development, and internal connection for production
export const connection: ConnectionOptions = isLocalDev 
  ? {
      // Use Railway proxy for local development
      host: RAILWAY_PROXY_HOST,
      port: RAILWAY_PROXY_PORT,
      password: env.REDIS_PASSWORD,
      ...commonOptions,
    }
  : {
      // For production in Railway, try the TCP proxy since internal connection is failing
      host: RAILWAY_PROXY_HOST, // Using the proxy that we confirmed works
      port: RAILWAY_PROXY_PORT,  // Using the port that we confirmed works
      username: env.REDIS_USER,
      password: env.REDIS_PASSWORD,
      ...commonOptions,
    };

// Log connection details (without exposing password) - only in development environment
if (isLocalDev) {
  console.log(`Redis connection configured for ${env.NODE_ENV} environment:`);
  console.log(`Host: ${connection.host}, Port: ${connection.port}`);
  console.log(`Username: ${connection.username || 'not set'}`);
  console.log(`Common options: connectTimeout=${commonOptions.connectTimeout}ms, maxRetries=${commonOptions.maxRetriesPerRequest}`);
}

export const createJobOptions = (
  opts?: DefaultJobOptions,
): DefaultJobOptions => {
  return {
    attempts: env.NODE_ENV === "production" ? 3 : 1,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    // Add memory optimization for job storage
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 500, // Keep only last 500 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 100, // Keep only last 100 failed jobs
    },
    ...opts,
  };
};
export const defaultJobOptions = createJobOptions();

export const createQueueOpts = (
  opts?: Omit<QueueOptions, "connection">,
): QueueOptions => {
  return {
    defaultJobOptions,
    ...opts,
    connection,
  };
};
export const defaultQueueOpts = createQueueOpts();

export const createWorkerOpts = (
  opts?: Omit<WorkerOptions, "connection">,
): WorkerOptions => {
  return {
    concurrency: env.NODE_ENV === "production" ? 5 : 10, // Reduce concurrency in production
    ...opts,
    connection,
  };
};
export const defaultWorkerOpts = createWorkerOpts();
