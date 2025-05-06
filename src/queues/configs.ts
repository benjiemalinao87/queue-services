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
  enableReadyCheck: true, // Re-enable ready check for stability
  maxRetriesPerRequest: 5, // Increase max retries 
  retryStrategy: (times: number) => {
    // More aggressive backoff - start at 500ms and increase exponentially
    const delay = Math.min(Math.pow(2, times) * 500, 10000); // Start at 500ms, max 10s
    if (times < 5) {
      console.log(`Redis connection retry attempt ${times} with delay ${delay}ms`);
    }
    return delay;
  },
  connectTimeout: 15000, // Increased from 5000ms to 15000ms
  disconnectTimeout: 10000, // Increased to 10000ms
  commandTimeout: 15000, // Increased from 5000ms to 15000ms
  family: 0, // Try both IPv4 and IPv6 again
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect for READONLY errors
    }
    return false;
  },
  // Keep some memory optimization settings but remove ones causing issues
  showFriendlyErrorStack: false, // Disable friendly error stack in production
  maxLoadingRetryTime: 5000, // Increased from 2000ms
  autoResubscribe: true, // Re-enable auto resubscribe for stability
  autoResendUnfulfilledCommands: true, // Re-enable auto resend for stability
  lazyConnect: false, // Connect immediately to avoid timing issues
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
