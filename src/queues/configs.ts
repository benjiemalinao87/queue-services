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

// Common connection options for better error handling
const commonOptions = {
  enableReadyCheck: true,
  maxRetriesPerRequest: 5,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000); // Increase delay with each retry, max 3s
    console.log(`Redis connection retry attempt ${times} with delay ${delay}ms`);
    return delay;
  },
  connectTimeout: 10000, // 10 seconds
  disconnectTimeout: 10000,
  commandTimeout: 10000,
  family: 0, // Try both IPv4 and IPv6
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect for READONLY errors
    }
    return false;
  }
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

// Log connection details (without exposing password)
console.log(`Redis connection configured for ${env.NODE_ENV} environment:`);
console.log(`Host: ${connection.host}, Port: ${connection.port}`);
console.log(`Username: ${connection.username || 'not set'}`);
console.log(`Common options: connectTimeout=${commonOptions.connectTimeout}ms, maxRetries=${commonOptions.maxRetriesPerRequest}`);

export const createJobOptions = (
  opts?: DefaultJobOptions,
): DefaultJobOptions => {
  return {
    attempts: env.NODE_ENV === "production" ? 3 : 1,
    backoff: {
      type: "exponential",
      delay: 1000,
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
    concurrency: 10,
    ...opts,
    connection,
  };
};
export const defaultWorkerOpts = createWorkerOpts();
