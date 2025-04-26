import { Queue } from "bullmq";
import { connection, defaultQueueOpts } from "./configs";
import { aiResponseSchema, type AIResponseData, rateLimitConfig } from "./schemas/ai-response-schema";
import Redis from "ioredis";

const QUEUE_NAME = "ai-response-queue";

// Create Redis client for rate limiting
const redisClient = new Redis(connection);

// Rate limiting helper functions
const getRateLimitKey = (type: "workspace" | "contact", key: string) => 
  `rate_limit:ai_response:${type}:${key}`;

const checkRateLimit = async (
  type: "workspace" | "contact",
  key: string
): Promise<boolean> => {
  const rateLimitKey = getRateLimitKey(type, key);
  const config = type === "workspace" 
    ? rateLimitConfig.perWorkspace 
    : rateLimitConfig.perContact;

  const now = Date.now();
  const windowStart = now - (config.duration * 1000);

  // Remove old entries
  await redisClient.zremrangebyscore(rateLimitKey, 0, windowStart);

  // Get current count
  const count = await redisClient.zcard(rateLimitKey);

  if (count >= config.points) {
    return false;
  }

  // Add new request
  await redisClient.zadd(rateLimitKey, now, `${now}-${Math.random()}`);
  // Set expiry on the set
  await redisClient.expire(rateLimitKey, config.duration * 2);

  return true;
};

// Create queue instance
export const aiResponseQueue = new Queue<AIResponseData>(QUEUE_NAME, {
  ...defaultQueueOpts,
  connection,
  defaultJobOptions: {
    ...defaultQueueOpts.defaultJobOptions,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Add job with rate limiting
export const addAIResponseJob = async (data: AIResponseData) => {
  // Validate input data
  const validatedData = aiResponseSchema.parse(data);

  // Check workspace rate limit
  const workspaceAllowed = await checkRateLimit("workspace", validatedData.workspace_id);
  if (!workspaceAllowed) {
    throw new Error(`Rate limit exceeded for workspace ${validatedData.workspace_id}`);
  }

  // Check contact rate limit
  const contactAllowed = await checkRateLimit("contact", validatedData.rate_limit_key);
  if (!contactAllowed) {
    throw new Error(`Rate limit exceeded for contact ${validatedData.contact_id}`);
  }

  // Add job to queue
  return aiResponseQueue.add("process", validatedData, {
    jobId: `${validatedData.workspace_id}:${validatedData.message_id}`,
  });
};

// Export queue metrics helper
export const getQueueMetrics = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    aiResponseQueue.getWaitingCount(),
    aiResponseQueue.getActiveCount(),
    aiResponseQueue.getCompletedCount(),
    aiResponseQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    name: QUEUE_NAME,
  };
};
