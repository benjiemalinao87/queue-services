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

// Redis server details - using the actual Redis hostname from Railway
const REDIS_HOSTNAME = 'redis.customerconnects.app';
const REDIS_PORT = 6379;

// Determine which connection to use based on environment
const isLocalDev = env.NODE_ENV === 'development';

// Use the proxy for local development, and direct hostname for production
export const connection: ConnectionOptions = isLocalDev 
  ? {
      // Use Railway proxy for local development
      host: RAILWAY_PROXY_HOST,
      port: RAILWAY_PROXY_PORT,
      password: env.REDIS_PASSWORD,
      connectTimeout: 10000, // 10 seconds timeout
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        console.log(`Redis connection retry attempt ${times}`);
        return Math.min(times * 100, 3000); // Exponential backoff with max 3s delay
      }
    }
  : {
      // Use direct Redis hostname instead of internal hostname
      host: env.REDIS_HOST || REDIS_HOSTNAME, // Use env var if set, otherwise use our constant
      port: env.REDIS_PORT || REDIS_PORT,
      username: env.REDIS_USER,
      password: env.REDIS_PASSWORD,
      family: 0, // 4 (IPv4) or 6 (IPv6)
      connectTimeout: 10000, // 10 seconds timeout
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        console.log(`Redis connection retry attempt ${times}`);
        return Math.min(times * 100, 3000); // Exponential backoff with max 3s delay
      },
      enableOfflineQueue: true,
      enableReadyCheck: true
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

// Default queue options
export const defaultQueueOpts: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1 second initial delay
    },
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 5000, // Keep last 5000 failed jobs
  },
};

// Worker options with default connections
export const defaultWorkerOpts: WorkerOptions = {
  connection,
  concurrency: 5,
  limiter: {
    max: 100, // Max number of jobs processed in duration
    duration: 60000, // 1 minute
    groupKey: "workspaceId", // Group rate limiting by workspace ID
  },
};

// Scheduler options
export const defaultSchedulerOpts = {
  connection,
};

// Default job options for scheduled jobs
export const scheduledJobOpts: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 second initial delay
  },
};

// Default options for rate-limited jobs
export const rateLimitedJobOpts: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 10000, // 10 second initial delay
  },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

// Rate limiter options (per queue)
export const defaultLimiterOpts: LimiterOptions = {
  max: 20, // Maximum number of jobs to process
  duration: 1000, // per second
  groupKey: "workspaceId", // Group by workspace ID
};
