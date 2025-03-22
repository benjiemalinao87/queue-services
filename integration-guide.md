# Queue Services Integration Guide - Developer Q&A

## Integration Point

**Recommendation**: Create a new service layer to handle the queue integration.

**Explanation**:
- A dedicated service layer (e.g., `QueueService.js`) would provide a clean separation of concerns
- This approach makes it easier to:
  - Mock the queue service during testing
  - Switch queue providers if needed in the future
  - Handle queue-specific error cases separately from business logic

### Why a Service Layer Is Valuable (Not Redundant)

1. **Abstraction and Decoupling**:
   - A service layer abstracts away the implementation details of the queue service
   - Your application code doesn't need to know about specific API endpoints, request formats, or error handling

2. **Centralized Error Handling**:
   - All queue-related errors can be handled consistently in one place
   - You can implement retries, logging, and monitoring in a single location

3. **Easier Testing**:
   - You can mock the service layer for unit tests without making actual API calls
   - This makes your tests faster and more reliable

4. **Future-Proofing**:
   - If the queue-services API changes, you only need to update the service layer
   - If you ever need to switch to a different queue provider, you can do so without changing your application code

5. **Business Logic Integration**:
   - The service layer can include business-specific transformations and validations
   - It can handle complex scenarios like calculating the right delay based on campaign rules

### Code Comparison

**Without a service layer** (code scattered throughout your application):

```javascript
// In CampaignBuilder.js
async function launchCampaign() {
  try {
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-email', {
      to: email,
      subject: subject,
      html: content,
      contactId: contactId,
      workspaceId: workspaceId,
      delay: calculateDelay()
    });
    // Handle response...
  } catch (error) {
    // Handle error...
  }
}

// In NotificationManager.js - similar code duplicated
async function sendNotification() {
  try {
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-email', {
      // Similar code duplicated...
    });
    // Similar handling duplicated...
  } catch (error) {
    // Similar error handling duplicated...
  }
}
```

**With a service layer** (clean, DRY code):

```javascript
// In QueueService.js
export async function scheduleEmail(emailData, delayMs) {
  try {
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-email', {
      ...emailData,
      delay: delayMs
    });
    return { success: true, jobId: response.data.jobId };
  } catch (error) {
    logger.error('Email scheduling failed', { error, emailData });
    return { success: false, error: error.message };
  }
}

// In CampaignBuilder.js
async function launchCampaign() {
  const result = await queueService.scheduleEmail(emailData, calculateDelay());
  if (result.success) {
    // Handle success...
  } else {
    // Handle error...
  }
}

// In NotificationManager.js
async function sendNotification() {
  const result = await queueService.scheduleEmail(notificationData, 0); // immediate
  // Handle result...
}
```

**Example Implementation**:
```javascript
// QueueService.js
export async function scheduleMessage(messageData, delayMs) {
  try {
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-email', {
      ...messageData,
      delay: delayMs
    });
    return { success: true, jobId: response.data.jobId };
  } catch (error) {
    console.error('Queue scheduling error:', error);
    return { success: false, error: error.message };
  }
}

// Then in CampaignBuilder.js
import { scheduleMessage } from './services/QueueService';

// Modify launchCampaign to use the service
async function launchCampaign(campaign) {
  // Your existing campaign logic
  // ...
  
  // Schedule messages using the queue service
  const result = await scheduleMessage(messageData, delayInMs);
  if (result.success) {
    // Store job ID, update UI, etc.
  } else {
    // Handle error
  }
}
```

## Campaign Timing

**Recommendation**: Calculate absolute timestamps from the day numbers and send times.

**Explanation**:
- The Queue Services API expects a delay in milliseconds from now
- You'll need to convert your day numbers and send times into absolute timestamps
- Consider timezone handling carefully

**Example Implementation**:
```javascript
function calculateDelayMs(dayNumber, sendTime, workspaceTimezone) {
  // Get current date
  const now = new Date();
  
  // Create target date (current date + dayNumber days)
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + dayNumber);
  
  // Parse send time (HH:MM:SS)
  const [hours, minutes, seconds] = sendTime.split(':').map(Number);
  
  // Set the time on the target date
  targetDate.setHours(hours, minutes, seconds, 0);
  
  // Convert to workspace timezone if needed
  // This would require a library like moment-timezone
  
  // Calculate delay in milliseconds
  const delayMs = targetDate.getTime() - now.getTime();
  
  // Ensure positive delay (if time today has already passed, schedule for tomorrow)
  return delayMs > 0 ? delayMs : delayMs + (24 * 60 * 60 * 1000);
}
```

## Error Handling

**Recommendation**: Store job IDs and implement a status tracking system.

**Explanation**:
- Store job IDs returned by Queue Services in your database
- Implement a status field for each scheduled message
- Consider implementing a status check endpoint that queries Queue Services

**Database Schema Example**:
```javascript
// Add to your message/campaign schema
{
  // Existing fields
  // ...
  
  // Queue-related fields
  queueJobId: String,
  queueStatus: {
    type: String,
    enum: ['SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'SCHEDULED'
  },
  queueError: String,
  scheduledFor: Date
}
```

## Batch Processing System

**New Feature**: The queue system now supports batch processing for SMS and email messages.

**What This Means For You**:
- No changes needed to your integration code
- Better performance for high-volume messaging
- Automatic rate limiting to prevent API throttling

### How Batch Processing Works

1. **Behind the Scenes**: When you send multiple messages, they're now processed in batches
2. **Rate Limiting**: SMS is limited to 50/second, Email to 100/second
3. **Workspace Grouping**: Messages are grouped by workspace ID for efficient processing
4. **Performance Monitoring**: New metrics API available to monitor performance

### Benefits of Batch Processing

1. **Improved Performance**: Process more messages in less time
2. **Cost Control**: Prevent unexpected spikes in API usage
3. **API Compliance**: Stay within rate limits of external providers
4. **Reliability**: Better error handling for batch operations

### Monitoring Your Messages

You can monitor batch processing performance through:

1. **Bull Board UI**: Available at `/admin/queues`
2. **Metrics API**: Available at `/api/metrics`

**Example Metrics API Response**:
```json
{
  "sms": {
    "totalProcessed": 1250,
    "batchesProcessed": 25,
    "successRate": 99.8,
    "avgProcessingTime": 120,
    "throughput": 42,
    "rateExceededCount": 0,
    "lastProcessedTime": "2025-03-22T10:15:30.123Z"
  },
  "email": {
    "totalProcessed": 850,
    "batchesProcessed": 9,
    "successRate": 100,
    "avgProcessingTime": 95,
    "throughput": 89,
    "rateExceededCount": 0,
    "lastProcessedTime": "2025-03-22T10:14:45.678Z"
  },
  "timestamp": "2025-03-22T10:15:45.123Z"
}
```

### Best Practices for High-Volume Messaging

1. **Stagger Large Campaigns**: For very large campaigns (10,000+ messages), consider staggering your API calls
2. **Monitor Performance**: Check the metrics API during high-volume periods
3. **Include Workspace ID**: Always include a valid workspace ID with each message
4. **Handle Errors**: Implement proper error handling for rate limit errors

For more detailed information, see the [Batch Processing Guide](./batch-processing-guide.md).

## Callback Endpoints

**Recommendation**: Verify existing endpoints and adapt as needed.

**Questions to answer**:
- Are `/send-sms` and `/api/email/send` already implemented? If yes:
  - Do they accept the format Queue Services will send?
  - Do they handle authentication properly?
  - Do they return appropriate success/error responses?

**If endpoints exist but need modification**:
- Create adapter functions to transform data between formats
- Ensure proper error handling and logging

**If endpoints don't exist**:
- Implement them according to the Queue Services documentation
- Ensure they're properly secured (validate workspace IDs, etc.)

## Additional Recommendations

### Testing Strategy
- Create a test environment for Queue Services integration
- Implement short delays (e.g., 5 seconds) for testing
- Mock the Queue Services API for unit tests

### Monitoring
- Set up monitoring for queue health
- Implement alerts for failed jobs
- Consider periodic reconciliation to catch missed messages

### Rollout Plan
- Start with a single campaign type
- Monitor closely during initial deployment
- Gradually expand to all campaign types

## Monitoring Rate Limits by Workspace

**New Feature**: The queue system now tracks rate limit exceedances by workspace ID.

### Why This Matters

In a multi-tenant system, it's crucial to know which workspaces are hitting rate limits. This information helps you:

1. **Identify Problematic Tenants**: Some workspaces may be sending an unusually high volume of messages
2. **Implement Fair Usage Policies**: Set different limits for different customer tiers
3. **Proactive Customer Support**: Reach out to customers before they experience significant issues
4. **Capacity Planning**: Make informed decisions about scaling your infrastructure

### How to Monitor Workspace Rate Limits

#### API Endpoints

The system provides dedicated API endpoints for workspace rate limit monitoring:

1. **Get All Metrics**:
   ```
   GET /api/metrics
   ```
   Response includes a `workspaceRateLimits` section with data for all workspaces.

2. **Get Workspace-Specific Metrics**:
   ```
   GET /api/metrics/workspace/:workspaceId
   ```
   Returns detailed rate limit data for a specific workspace.

3. **Reset Workspace Metrics**:
   ```
   POST /api/metrics/reset
   {
     "type": "sms", // or "email" or omit for both
     "workspaceId": "workspace-123"
   }
   ```
   Resets metrics for a specific workspace.

#### Example Response

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

### Integration Example

```javascript
// Monitor rate limits for a specific workspace
async function checkWorkspaceRateLimits(workspaceId) {
  try {
    const response = await axios.get(`https://queue-services-production.up.railway.app/api/metrics/workspace/${workspaceId}`);
    const { sms, email } = response.data;
    
    // Check if this workspace has exceeded rate limits
    if (sms.count > 0 || email.count > 0) {
      console.warn(`Workspace ${workspaceId} has exceeded rate limits:`, {
        smsExceededCount: sms.count,
        emailExceededCount: email.count,
        lastSmsExceeded: sms.lastExceeded,
        lastEmailExceeded: email.lastExceeded
      });
      
      // Notify administrators or take other actions
      notifyAdmins(`Workspace ${workspaceId} is experiencing rate limit issues`);
      
      // If this is a high-tier customer, you might want to increase their limits
      if (isHighTierCustomer(workspaceId)) {
        adjustRateLimits(workspaceId);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error checking workspace rate limits:', error);
    return null;
  }
}

// Set up a scheduled job to monitor high-volume workspaces
schedule.scheduleJob('*/10 * * * *', async () => { // Every 10 minutes
  const highVolumeWorkspaces = await getHighVolumeWorkspaces();
  for (const workspace of highVolumeWorkspaces) {
    await checkWorkspaceRateLimits(workspace.id);
  }
});
```

### Best Practices for Rate Limit Management

1. **Proactive Monitoring**: Regularly check rate limits for high-volume workspaces
2. **Tiered Limits**: Consider implementing different rate limits for different customer tiers
3. **Graceful Degradation**: When rate limits are hit, queue messages for later delivery instead of failing
4. **Customer Communication**: Notify customers when they're approaching their rate limits
5. **Automatic Scaling**: For premium customers, consider automatically increasing limits when needed

For more detailed information, see the [Batch Processing Guide](./batch-processing-guide.md).

## Conclusion
