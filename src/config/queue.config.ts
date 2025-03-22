import type {
  ConnectionOptions,
  DefaultJobOptions,
  QueueOptions,
  WorkerOptions,
  JobsOptions,
  LimiterOptions,
} from "bullmq";
import { env } from "@/env";

// Railway proxy details (for local development and testing)
const RAILWAY_PROXY_HOST = 'caboose.proxy.rlwy.net';
const RAILWAY_PROXY_PORT = 58064;

// Determine which connection to use based on environment
const isLocalDev = env.NODE_ENV === 'development';

// Use the proxy for local development, and internal connection for production
export const connection: ConnectionOptions = isLocalDev 
  ? {
      // Use Railway proxy for local development
      host: RAILWAY_PROXY_HOST,
      port: RAILWAY_PROXY_PORT,
      password: env.REDIS_PASSWORD,
    }
  : {
      // Use internal connection for production (when running on Railway)
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      username: env.REDIS_USER,
      password: env.REDIS_PASSWORD,
      family: 0, // 4 (IPv4) or 6 (IPv6)
    };

// Batch limit settings for SMS
export const smsLimiterOptions: LimiterOptions = {
  max: 50,         // Maximum number of jobs processed per duration
  duration: 1000,  // Time window in milliseconds (1 second)
};

// Batch limit settings for Email
export const emailLimiterOptions: LimiterOptions = {
  max: 100,        // Emails typically have higher rate limits than SMS
  duration: 1000,  // Time window in milliseconds (1 second)
};

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

// Create worker options with batch processing capabilities
export const createWorkerOpts = (
  opts?: Omit<WorkerOptions, "connection">,
  limiter?: LimiterOptions,
): WorkerOptions => {
  return {
    concurrency: 10,
    ...opts,
    connection,
    limiter,
  };
};

// Default worker options without limiter
export const defaultWorkerOpts = createWorkerOpts();

// SMS worker options with limiter
export const smsWorkerOpts = createWorkerOpts({}, smsLimiterOptions);

// Email worker options with limiter
export const emailWorkerOpts = createWorkerOpts({}, emailLimiterOptions);

// Batch processing worker options for SMS
export const smsBatchWorkerOpts = createWorkerOpts({
  concurrency: 5,   // Number of concurrent batches
  batchSize: 50,    // Process 50 SMS jobs per batch
}, smsLimiterOptions);

// Batch processing worker options for Email
export const emailBatchWorkerOpts = createWorkerOpts({
  concurrency: 5,   // Number of concurrent batches
  batchSize: 100,   // Process 100 email jobs per batch
}, emailLimiterOptions);
