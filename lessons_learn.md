# Lessons Learned

## Redis Connectivity

### Railway Proxy for Redis Access

- **Problem**: When running locally, we couldn't connect directly to `redis.railway.internal` (hostname not found) or `redis.customerconnects.app` (connection timeout).
  
- **Solution**: Railway provides a TCP proxy that allows external connections to internal services. The proxy address `caboose.proxy.rlwy.net:58064` forwards traffic to the Redis instance running on port 6379.

- **Implementation**: We modified our connection configuration to use the Railway proxy for local development while still using the internal connection for production:

```typescript
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
    };
```

### Connection Testing Best Practices

- **Timeouts**: Always implement connection timeouts when testing Redis connections to avoid hanging indefinitely.
  
- **Error Handling**: Implement proper error handling to catch and log specific error types (connection refused, timeout, authentication failure).

- **Comprehensive Testing**: Test multiple connection configurations to identify which ones work in different environments.

## BullMQ Queue Management

- Successfully added both regular and scheduled jobs to queues using the Railway proxy.
  
- Job counts can be retrieved to verify the status of jobs in the queue:
  ```typescript
  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  ```

- Always close queue connections after use to prevent resource leaks:
  ```typescript
  await queue.close();
  ```

## Environment-Specific Configuration

- Use environment variables to determine which connection configuration to use based on the current environment.
  
- Implement fallback values for environment variables to ensure the application can run even if some variables are missing.

- Document all environment variables used in the application to make it easier for others to configure the application.

## Queue Design Patterns

### Separate Queues for Different Job Types

- **Pattern**: Create separate queues for different types of jobs (e.g., `send-sms-queue` and `scheduled-sms-queue`).
  
- **Benefits**:
  - Better organization and monitoring of different job types
  - Ability to apply different job options (retries, backoff, etc.) to different job types
  - Easier to scale workers for specific job types
  - Improved visibility into queue performance and bottlenecks

- **Implementation**:
  ```typescript
  // Regular SMS queue
  export const sendSMSQueue = new Queue("send-sms-queue", {
    connection,
    defaultJobOptions,
  });

  // Scheduled SMS queue with different options
  export const scheduledSMSQueue = new Queue("scheduled-sms-queue", {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      removeOnComplete: {
        age: 7 * 24 * 3600, // keep completed jobs for 7 days
        count: 1000, // keep the latest 1000 completed jobs
      },
    },
  });
  ```

### Helper Functions for Job Addition

- **Pattern**: Create helper functions that handle validation and routing to the appropriate queue.
  
- **Benefits**:
  - Centralized validation of job data
  - Simplified API for adding jobs
  - Consistent handling of job options
  - Ability to route jobs to different queues based on job data

- **Implementation**:
  ```typescript
  // Helper function for adding SMS jobs
  export async function addSMSJob(data: unknown) {
    const validatedData = smsSchema.parse(data);
    
    // If scheduledFor is provided, add to scheduled queue
    if (validatedData.scheduledFor) {
      const scheduledTime = new Date(validatedData.scheduledFor);
      const now = new Date();
      const delay = Math.max(0, scheduledTime.getTime() - now.getTime());
      
      return scheduledSMSQueue.add("scheduled-sms", validatedData, {
        delay,
      });
    }
    
    // Otherwise, add to regular queue
    return sendSMSQueue.add("send-sms", validatedData);
  }
  ```

## Schema Validation

- Using Zod for schema validation provides strong typing and runtime validation:
  ```typescript
  export const smsSchema = z.object({
    phoneNumber: z.string().min(1, "Phone number is required"),
    message: z.string().min(1, "Message is required"),
    scheduledFor: z.string().optional().nullable(),
    metadata: z.record(z.any()).optional(),
  });
  ```

- Validating job data before adding to the queue prevents invalid jobs from being added and provides better error messages.
