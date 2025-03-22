# Batch Processing Implementation Guide

## Overview

This guide explains how we've implemented batch processing for SMS and email queues in our queue service system. The implementation provides better performance, cost control, and adherence to API rate limits.

## Key Features

- **Batch Processing**: Process multiple SMS or email jobs in a single batch
- **Rate Limiting**: Control the number of requests per second to external APIs
- **Workspace Grouping**: Group messages by workspace for better organization
- **Metrics Tracking**: Monitor batch processing performance
- **Error Handling**: Robust error handling for batch processing failures

## Configuration

The batch processing system is configured in `src/config/queue.config.ts`. The main configuration parameters are:

### SMS Queue
- **Rate Limit**: 50 jobs per second
- **Concurrency**: 5 parallel workers

### Email Queue
- **Rate Limit**: 100 jobs per second
- **Concurrency**: 5 parallel workers

## How It Works

1. **Job Submission**: Jobs are added to the queue as before, with no changes to the API
2. **Batch Collection**: The worker collects multiple jobs into a batch
3. **Workspace Grouping**: Jobs are grouped by workspace ID
4. **Parallel Processing**: Each group is processed in parallel with rate limiting
5. **Metrics Collection**: Performance metrics are collected for monitoring

## Implementation Details

### Queue Configuration

The queue configuration is centralized in `src/config/queue.config.ts`:

```typescript
// SMS Queue Configuration
export const smsWorkerOpts: WorkerOptions = {
  connection,
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000,
  }
};

// Email Queue Configuration
export const emailWorkerOpts: WorkerOptions = {
  connection,
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 1000,
  }
};
```

### Worker Implementation

The workers are implemented in `src/worker/sms-worker.ts` and `src/worker/email-worker.ts`. The key aspects are:

1. **Batch Processing Logic**:
   ```typescript
   // Process as batch
   const jobs = job as unknown as Job<SMSData>[];
   console.log(`Processing batch of ${jobs.length} SMS jobs`);
   
   // Group messages by workspaceId for better organization
   const messagesByWorkspace: Record<string, Job<SMSData>[]> = {};
   
   jobs.forEach(job => {
     const { workspaceId } = job.data;
     if (!messagesByWorkspace[workspaceId]) {
       messagesByWorkspace[workspaceId] = [];
     }
     messagesByWorkspace[workspaceId].push(job);
   });
   ```

2. **Parallel Processing with Rate Limiting**:
   ```typescript
   // Process each workspace's messages
   const results = await Promise.all(
     Object.entries(messagesByWorkspace).map(async ([workspaceId, workspaceJobs]) => {
       // Process jobs for this workspace
     })
   );
   ```

3. **Progress Updates**:
   ```typescript
   // Update progress for all jobs
   await Promise.all(workspaceJobs.map(job => job.updateProgress(10)));
   ```

### Metrics Tracking

We've implemented a metrics system in `src/utils/metrics.ts` to track batch processing performance:

```typescript
// Start tracking metrics for this batch
const completeBatchMetrics = startBatchProcessing('sms');

// Record successful batch completion
const metrics = completeBatchMetrics(jobs.length, true);
console.log(`Batch processing metrics:`, metrics);
```

## API Endpoints

### Metrics API

We've added a metrics API to monitor batch processing performance:

- **GET /api/metrics**: Get current metrics for SMS and Email batch processing
- **POST /api/metrics/reset**: Reset metrics for a specific type or all types

## Monitoring

You can monitor the batch processing system through:

1. **Bull Board UI**: Available at `/admin/queues`
2. **Metrics API**: Available at `/api/metrics`
3. **Logs**: Check the console logs for detailed information

## Workspace-Specific Rate Limit Tracking

As a multi-tenant system, we track rate limit exceedances by workspace ID to identify which tenants might be experiencing issues or exceeding their fair share of resources.

### How Workspace Tracking Works

1. **Data Collection**: When a rate limit is exceeded, we record:
   - The workspace ID
   - Timestamp of the exceedance
   - Batch size that triggered the limit
   - Error message details

2. **API Endpoints**:
   - **GET /api/metrics**: Includes workspace rate limit data in the response
   - **GET /api/metrics/workspace/:workspaceId**: Get detailed rate limit data for a specific workspace
   - **POST /api/metrics/reset**: Can reset metrics for a specific workspace

### Example API Response

```json
{
  "workspaceId": "workspace-123",
  "sms": {
    "count": 5,
    "lastExceeded": "2025-03-22T10:15:30.123Z",
    "details": [
      {
        "timestamp": "2025-03-22T10:15:30.123Z",
        "batchSize": 75,
        "errorMessage": "Rate limit exceeded: 50 per second"
      }
    ]
  },
  "email": {
    "count": 0,
    "lastExceeded": null,
    "details": []
  },
  "timestamp": "2025-03-22T10:20:45.678Z"
}
```

### Using Workspace Rate Limit Data

This data can be used to:

1. **Identify Problematic Tenants**: Find workspaces that frequently hit rate limits
2. **Implement Fair Usage Policies**: Set different rate limits for different tiers of customers
3. **Proactive Monitoring**: Set up alerts when a workspace exceeds limits too frequently
4. **Capacity Planning**: Use the data to determine if you need to increase overall system capacity

### Implementation Details

The workspace tracking is implemented in:

1. **Metrics Utility** (`src/utils/metrics.ts`):
   ```typescript
   // Track workspace-specific rate limit exceedances
   workspaceRateLimits: {} as Record<string, {
     count: number,
     lastExceeded: Date,
     details: Array<{
       timestamp: Date,
       batchSize: number,
       errorMessage: string
     }>
   }>
   ```

2. **Workers** (`src/worker/sms-worker.ts` and `src/worker/email-worker.ts`):
   ```typescript
   // Record failed batch with workspace information
   const metrics = completeBatchMetrics(
     jobs.length, 
     false, 
     isRateLimitError,
     affectedWorkspaceId,
     errorMessage
   );
   ```

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**:
   - Check the metrics API for `rateExceededCount`
   - Consider reducing the rate limit or increasing the duration

2. **Batch Processing Errors**:
   - Check the logs for detailed error messages
   - Look for patterns in the failed jobs

3. **Performance Issues**:
   - Monitor the `avgProcessingTime` and `throughput` metrics
   - Adjust the concurrency settings if needed

## Best Practices

1. **Optimal Batch Size**: The system automatically determines batch size, but you can monitor performance to ensure it's optimal

2. **Rate Limit Configuration**: Set rate limits based on the external API's requirements

3. **Error Handling**: Always check for errors in the batch processing results

4. **Monitoring**: Regularly check the metrics API to ensure the system is performing well

## Integration with Existing Code

The batch processing system is designed to work seamlessly with the existing code. No changes are needed to the API endpoints or the way jobs are added to the queue.

## Future Improvements

1. **Dynamic Rate Limiting**: Adjust rate limits based on API response times
2. **Retry Strategies**: Implement more sophisticated retry strategies for failed jobs
3. **Advanced Metrics**: Add more detailed metrics for better monitoring
4. **Dashboard**: Create a dedicated dashboard for monitoring batch processing performance
