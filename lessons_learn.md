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

## SMS Queue Integration

### Redis Connection Strategies
When connecting to Redis from different environments, it's important to understand the various connection strategies:

1. **Internal Network Connection**: Within Railway's network, services can connect to each other using internal hostnames like `redis.railway.internal`. This is secure and efficient but only works within Railway's network.

2. **Proxy Connection**: Railway provides a proxy connection (e.g., `caboose.proxy.rlwy.net:58064`) that can be used from outside Railway's network. This is useful for development and testing from local environments.

3. **Public URL Connection**: For services that need to be accessible from the public internet, Railway provides public URLs (e.g., `redis-production-c503.up.railway.app`). These should be used carefully with proper authentication.

### API Integration Best Practices
When integrating with external APIs like the SMS API:

1. **Validation**: Always validate input data before sending it to the API to prevent errors and ensure data integrity.

2. **Error Handling**: Implement comprehensive error handling to gracefully manage API failures and provide meaningful error messages.

3. **Progress Tracking**: Use job progress updates to track the status of API calls and provide visibility into the process.

4. **Logging**: Log important events and responses for debugging and monitoring purposes.

5. **Retries**: Configure appropriate retry strategies for transient failures to improve reliability.

### Queue Design Patterns
Effective queue design patterns for SMS processing:

1. **Separate Queues for Different Purposes**: Using separate queues for immediate and scheduled SMS messages improves organization and makes monitoring easier.

2. **Scheduled Jobs**: BullMQ's delayed job feature is perfect for implementing scheduled SMS messages without needing a separate scheduling system.

3. **Worker Specialization**: Creating specialized workers for different types of jobs (e.g., email vs. SMS) improves maintainability and allows for targeted scaling.

4. **Schema Validation**: Using Zod for schema validation ensures that job data is properly formatted before processing, reducing errors during execution.

5. **Graceful Shutdown**: Implementing proper shutdown procedures ensures that jobs are not lost when the service is stopped or restarted.

## SMS API Integration

### API Endpoint Configuration

When integrating with external APIs, it's important to understand the correct endpoint structure:

1. **Base URL**: The base URL should be configured as an environment variable (e.g., `SMS_API_URL: "https://cc.automate8.com"`).

2. **Endpoint Path**: The specific endpoint path (e.g., `/send-sms`) should be appended to the base URL in the code.

3. **Request Format**: Ensure that the request body matches the expected format of the API:
   ```typescript
   {
     to: phoneNumber,
     message: message,
     contactId: contactId,
     workspaceId: workspaceId,
     ...additionalMetadata
   }
   ```

4. **Required Fields**: Some APIs have required fields that must be included in every request. For our SMS API, `to`, `message`, and `workspaceId` are required fields.

### Default Values for Required Fields

When working with APIs that require specific fields:

1. **Schema Defaults**: Use Zod schema defaults to provide fallback values for required fields:
   ```typescript
   contactId: z.string().default("5346834e-479f-4c5f-a53c-7bf97837fd68"),
   workspaceId: z.string().or(z.number()).default("66338"),
   ```

2. **Validation**: Always validate the data before sending it to the API to ensure all required fields are present.

3. **Error Handling**: Implement comprehensive error handling to catch and log specific error types, especially for missing required fields.

### Field Naming Conventions

When integrating with external APIs, pay attention to the field naming conventions:

1. **API Expectations**: The SMS API expects `message` instead of `content` for the message text.

2. **Consistent Naming**: Ensure consistent naming between your schema, worker, and API requests.

3. **Testing**: Always test the API directly first to understand its requirements before integrating it with your queue system.

### Redis Connection Challenges

When connecting to Redis from a local environment to a remote instance:

1. **Timeouts**: Connection timeouts are common when trying to connect to remote Redis instances from local environments.

2. **Connection Options**:
   - **Internal Network**: Only works within the same network (e.g., `redis.railway.internal` within Railway).
   - **Proxy Connection**: Can work from external networks but may have limitations (e.g., `caboose.proxy.rlwy.net:58064`).
   - **Public URL**: May be accessible but could have security implications (e.g., `redis-production-c503.up.railway.app`).

3. **Deployment Strategy**: For reliable operation, it's best to deploy both the worker and the queue service in the same environment (e.g., both on Railway) to ensure stable Redis connectivity.

## Email Queue Implementation

### Static File Serving in Production

- **Problem**: When deploying to production, static file serving using `import.meta.url` with ES modules didn't work as expected, resulting in 404 errors for static files.

- **Solution**: Use `process.cwd()` instead of `import.meta.url` for determining file paths in production environments:

```typescript
// Before (problematic in production)
fastify.register(fastifyStatic, {
  root: path.join(path.dirname(fileURLToPath(import.meta.url)), "../public"),
  prefix: "/static",
});

// After (works reliably in production)
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/static",
});
```

- **Lesson**: When working with file paths in Node.js applications that will be deployed to different environments, prefer using `process.cwd()` which is more reliable across different runtime environments and build processes.

### Queue Structure for Email Processing

- **Pattern**: Similar to the SMS queue structure, we created separate queues for immediate and scheduled email delivery.

- **Benefits**:
  - Consistent pattern across different message types (SMS and email)
  - Better organization and monitoring of different job types
  - Ability to apply different processing strategies to immediate vs. scheduled emails

- **Implementation**:
```typescript
// Regular email queue
export const sendEmailQueue = new Queue("send-email-queue", {
  connection,
  defaultJobOptions,
});

// Scheduled email queue
export const scheduledEmailQueue = new Queue("scheduled-email-queue", {
  connection,
  defaultJobOptions,
});
```

### API Endpoint Design

- **Pattern**: We designed the email scheduling API endpoint to be similar to the SMS endpoint for consistency.

- **Benefits**:
  - Consistent API design makes integration easier for clients
  - Similar error handling and response formats
  - Reusable patterns for validation and job creation

- **Implementation**:
```typescript
// API endpoint for scheduling Email
fastify.post<{
  Body: {
    to: string;
    subject: string;
    html: string;
    contactId: string;
    workspaceId: string;
    delay: number;
    metadata?: Record<string, any>;
  };
}>("/api/schedule-email", async (request, reply) => {
  // Similar structure to SMS endpoint
  // ...
});
```

### UI Testing Design

- **Pattern**: Created a comprehensive UI for testing email functionality, similar to the SMS testing UI.

- **Benefits**:
  - Provides an easy way to test the API without writing code
  - Includes validation and error handling
  - Offers visual feedback on the results

- **Lesson**: Having a well-designed testing UI significantly speeds up development and debugging by making it easy to test different scenarios without writing custom code.

### Environment Variables Management

- **Pattern**: Added environment variables for the Email API URL, similar to the SMS API URL.

- **Benefits**:
  - Consistent configuration pattern
  - Flexibility to change the API URL without code changes
  - Environment-specific configuration

- **Lesson**: Centralizing configuration in environment variables makes the application more flexible and easier to deploy to different environments.
