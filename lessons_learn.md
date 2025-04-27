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
When connecting to Redis from different environments, it's essential to understand the various connection strategies:

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

When integrating with external APIs, it's crucial to understand the correct endpoint structure:

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

## Consistent Identifier Usage Between Test and Production

### Issue
The dashboard was displaying generic workspace identifiers (e.g., "workspace-1") while the Bull dashboard showed actual numeric IDs (e.g., "66338"). This inconsistency made it difficult to correlate data between different monitoring interfaces.

### Solution
- Updated test data generation to use the same numeric workspace IDs that are used in the production queue jobs
- Modified the dashboard to display actual workspace IDs instead of generic names
- Implemented a client-side transformation approach to map generic IDs to actual IDs without requiring server changes

### Lessons Learned

1. **Identifier Consistency Matters**: Using consistent identifiers across all parts of the system (test data, production data, UI displays) is crucial for effective monitoring and debugging.

2. **Client-Side Transformations**: When dealing with deployed applications, client-side transformations can provide immediate solutions without requiring server deployments:
   - We implemented a mapping function in the dashboard JavaScript to transform generic IDs to actual IDs
   - This approach allowed us to fix the issue without modifying server-side data structures

3. **Separation of Display vs. API Values**: It's essential to distinguish between:
   - Values used for display purposes (transformed IDs for human readability)
   - Values used for API calls (original IDs for system compatibility)
   
4. **Graceful Fallbacks**: Our transformation function included a fallback to the original ID if no mapping was found, ensuring the system remains robust even with unexpected data.

5. **Documentation Importance**: Documenting the mapping between generic and actual IDs is essential for maintenance and future development.

6. **Testing Considerations**: When generating test data, it's critical to match the structure and format of production data as closely as possible to avoid discrepancies in monitoring tools.

7. **Deployment Strategy**: For long-term solutions:
   - Consider storing mappings in configuration files for easier updates
   - Explore fetching actual workspace names from a database to provide more context
   - Implement server-side transformations for a more comprehensive solution

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

## Troubleshooting Production Deployments

### Zod Schema Validation Issues

- **Problem**: When using Zod for schema validation, we encountered an error: `TypeError: __WEBPACK_EXTERNAL_MODULE_zod__.z.string(...).or(...).min is not a function`.

- **Solution**: When using union types in Zod, validation methods like `.min()` cannot be chained directly on the union. Instead, they must be applied to each member of the union separately:

```typescript
// Incorrect:
workspaceId: z.string().or(z.number()).min(1, "Workspace ID is required"),

// Correct:
workspaceId: z.union([
  z.string().min(1, "Workspace ID is required"),
  z.number().min(1, "Workspace ID is required")
]),
```

- **Lesson**: When using type unions with validation libraries like Zod, make sure to understand how method chaining works with union types. Validation methods typically need to be applied to each member of the union separately rather than to the union itself.

### API Testing vs UI Testing

- **Problem**: While the UI routes were not accessible due to static file serving issues, the API endpoints were still functioning correctly.

- **Solution**: Use direct API testing with tools like curl to verify functionality when UI testing is not possible:

```bash
curl -X POST https://queue-services-production.up.railway.app/api/schedule-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test Email","html":"<p>This is a test email</p>","contactId":"123456","workspaceId":"66338","delay":0}'
```

- **Lesson**: Always implement and test API endpoints independently from UI components. This allows you to verify core functionality even when there are issues with the UI layer.

### Incremental Troubleshooting

- **Problem**: When facing multiple issues in a production deployment, it can be challenging to identify and fix each problem.

- **Solution**: Use an incremental approach to troubleshooting:
  1. First, verify if the application is running at all (health check)
  2. Test core functionality via APIs directly
  3. Check monitoring interfaces (Bull Board)
  4. Address UI and static file issues separately

- **Lesson**: Breaking down troubleshooting into smaller, focused steps helps isolate and fix issues more effectively than trying to solve everything at once.

## Security Best Practices

### Secure Credential Management

- **Problem**: Hardcoded credentials were accidentally committed to the GitHub repository, exposing sensitive Redis connection information.

- **Solution**: 
  1. Remove all hardcoded credentials from the codebase
  2. Use environment variables for all sensitive information
  3. Create a `.env.example` file with placeholder values as documentation
  4. Add sensitive files to `.gitignore`
  5. Use Railway's built-in environment variable management for deployment

- **Lesson**: Never hardcode credentials in your codebase, even in test files. Always use environment variables and ensure that files containing actual credentials are included in `.gitignore`. Regularly scan your codebase for potential credential leaks before committing changes.

### Credential Rotation After Exposure

- **Problem**: Once credentials are exposed in a Git repository, simply removing them is not enough as they remain in the Git history.

- **Solution**:
  1. Immediately rotate (change) all exposed credentials
  2. Update environment variables in all deployment environments
  3. Consider using Git history rewriting tools for critical security issues (with caution)
  4. Set up automated scanning tools to detect credential leaks

- **Lesson**: Treat any exposed credential as compromised and rotate it immediately. The Git history preserves all previous commits, so even if you remove credentials in a new commit, they remain accessible in the repository history.

## Dashboard UI and Error Handling

### Preventing "Cannot set properties of null" Errors

- **Problem**: The dashboard was experiencing errors like "Cannot set properties of null (setting 'textContent')" when trying to update DOM elements that didn't exist or when handling incomplete data.

- **Solution**: Implemented defensive programming techniques with comprehensive null checks throughout the JavaScript code:

```javascript
// Before: Prone to errors if element doesn't exist
document.getElementById('someElement').textContent = data.value;

// After: Safe handling with null checks
const element = document.getElementById('someElement');
if (element) {
  element.textContent = data.value ? data.value : 'N/A';
}
```

- **Key Takeaways**:
  1. Always check if DOM elements exist before manipulating them
  2. Validate data structure before accessing nested properties
  3. Provide fallback values for potentially undefined data
  4. Use defensive programming to handle edge cases gracefully

### UI Duplication Issues

- **Problem**: The dashboard had duplicate workspace tables causing confusion and potential errors in the JavaScript code that updates these tables.

- **Solution**: Removed the duplicate table from the HTML and ensured all JavaScript references were updated to work with the single table:

```javascript
// Added null checks and data validation
function updateWorkspaceTable(data) {
  const tableBody = document.getElementById('workspaceTableBody');
  if (!tableBody) {
    console.error('Element with ID "workspaceTableBody" not found in the DOM');
    return;
  }
  
  // Proceed with updating the table safely
  // ...
}
```

- **Key Takeaways**:
  1. Maintain a clean DOM structure without duplicate IDs or redundant elements
  2. Log errors when expected elements are not found to aid debugging
  3. Structure JavaScript to gracefully handle missing elements
  4. Test UI components with both complete and incomplete data sets

### Data Validation Best Practices

- **Problem**: The dashboard code assumed that all data properties would always exist, causing errors when processing incomplete metrics data.

- **Solution**: Added comprehensive data validation throughout the code to safely handle missing or incomplete data:

```typescript
// Before: Assumes data.sms and data.email always exist
const smsCount = data.sms.totalProcessed;
const emailCount = data.email.totalProcessed;

// After: Safely handles missing data
const smsCount = data.sms && data.sms.totalProcessed ? data.sms.totalProcessed : 0;
const emailCount = data.email && data.email.totalProcessed ? data.email.totalProcessed : 0;
```

- **Key Takeaways**:
  1. Never assume API responses will have a complete data structure
  2. Provide default values for all potentially missing data
  3. Use optional chaining and nullish coalescing when available
  4. Structure code to be resilient to API changes

## Worker Integration in Bull Dashboard

### Proper Registration of All Queue Workers

- **Problem**: The AI response worker was not properly integrated into the Bull dashboard monitoring, causing it to be invisible in monitoring tools and not included in graceful shutdown procedures.

- **Solution**: Updated the worker/index.ts file to properly incorporate the AI response worker by:
  1. Importing the worker module
  2. Adding it to the graceful shutdown function
  3. Logging its concurrency and rate limit settings
  4. Exporting the module

- **Implementation**:
  ```typescript
  // Import the worker
  import { aiResponseWorker } from "./ai-response-worker";

  // Add to graceful shutdown
  export async function gracefulShutdown() {
    console.log("Shutting down workers...");
    await Promise.all([
      smsWorker.close(),
      emailWorker.close(),
      aiResponseWorker.close()
    ]);
  }

  // Log worker configuration
  console.log(`AI Response Worker concurrency: ${aiResponseWorker.concurrency}`);
  console.log(`AI Response Worker rate limit: ${aiResponseWorker.rateLimit}`);

  // Export the worker
  export * from "./ai-response-worker";
  ```

### Best Practices for Worker Registration

1. **Complete Worker Registration**: Always make sure all worker modules are properly imported, registered for shutdown, and exported.

2. **Logging Configuration**: Log the configuration of all workers during startup to confirm they're properly initialized.

3. **Consistent Export Pattern**: Use a consistent pattern for exporting worker modules to ensure they're accessible from the main worker index.

4. **Graceful Shutdown**: Include all workers in the graceful shutdown function to prevent resource leaks and incomplete jobs.

## AI Response Queue Integration

### Understanding the AI Response Flow

The AI response queue provides a way to process user messages with AI and return responses. Here's how it works:

1. **Message Submission**: A frontend application sends a message to the queue service with:
   - `workspace_id` - Identifier for the workspace
   - `contact_id` - Identifier for the contact/user
   - `message_id` - Unique identifier for the message
   - `message_text` - The actual user query to be processed
   - `callback_url` - Where to send the AI's response
   - `rate_limit_key` - Used for rate limiting

2. **Queue Processing**: The message is added to the `ai-response-queue` and picked up by the worker.

3. **AI Generation**: The worker processes the message with AI (or simulates a response for testing).

4. **Callback Execution**: The worker sends the AI response to the provided callback URL.

5. **Frontend Delivery**: The backend receives the callback and delivers the response to the user.

### Implementation Notes

- **Callback Format Flexibility**: The worker supports different callback formats based on the endpoint:
  ```typescript
  // For SMS endpoint
  {
    to: contactId,
    message: aiResponseText,
    workspaceId: workspaceId,
    // Other SMS-specific fields
  }

  // For dedicated AI response endpoint
  {
    workspace_id: workspaceId,
    message_id: messageId,
    job_id: jobId,
    response_text: aiResponseText
  }
  ```

- **Testing Approaches**: For testing, you can:
  1. Use the SMS endpoint as a callback (since it exists)
  2. Create a dedicated endpoint for AI responses
  3. Use a test endpoint like webhook.site to see the raw callback data

### Troubleshooting

- **Failed Jobs**: Check job logs to see why jobs fail. Common reasons:
  - Callback URL doesn't exist
  - Callback expects different parameters
  - Network issues between services

- **Monitoring**: Use the Bull Dashboard to monitor the queue:
  - Active jobs - Currently being processed
  - Completed jobs - Successfully processed
  - Failed jobs - Failed to process (red in the dashboard)

### Next Steps for Production

For a production-ready AI response system:

1. **Connect to a Real AI Service**: Replace the simulated response with calls to OpenAI or another AI provider.

2. **Create a Dedicated Callback Endpoint**: Implement a specific endpoint for handling AI responses.

3. **Add Metrics Tracking**: Track AI response times, success rates, and other metrics.

4. **Implement Error Recovery**: Add logic to handle different types of failures and retry strategies.
