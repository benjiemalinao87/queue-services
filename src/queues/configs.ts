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
