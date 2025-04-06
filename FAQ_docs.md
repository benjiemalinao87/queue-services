# Queue Services FAQ

This document provides answers to frequently asked questions about our queue services system, which handles SMS and email message processing for our CRM application.

## Table of Contents

1. [Basic Architecture](#basic-architecture)
2. [Endpoints for Immediate Message Sending](#endpoints-for-immediate-message-sending)
3. [Bulk Sending Capabilities](#bulk-sending-capabilities)
4. [Rate Limiting and API Constraints](#rate-limiting-and-api-constraints)
5. [Error Handling](#error-handling)
6. [Monitoring and Metrics](#monitoring-and-metrics)
7. [Sender ID / "From" Phone Number](#sender-id--from-phone-number)

## Basic Architecture

Our queue services system uses BullMQ with Redis to implement reliable message processing for both SMS and email communications.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend App   │────▶│  Queue Service  │────▶│   SMS/Email     │
│                 │     │  (BullMQ+Redis) │     │     APIs        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │     ▲
                              │     │
                              ▼     │
                        ┌─────────────────┐
                        │                 │
                        │  Metrics &      │
                        │  Monitoring     │
                        │                 │
                        └─────────────────┘
```

The system includes:

1. **Direct API endpoints** for immediate message sending
2. **Queue-based system** with:
   - `send-sms-queue` for immediate SMS delivery
   - `scheduled-sms-queue` for delayed SMS delivery
   - `send-email-queue` for immediate email delivery
   - `scheduled-email-queue` for delayed email delivery

This architecture provides reliability, scalability, and scheduling capabilities while maintaining a clean separation of concerns.

## Endpoints for Immediate Message Sending

When sending messages/emails from the frontend with no delay, the following endpoints are used:

### For immediate SMS sending:
```
POST /api/schedule-sms
```

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Your message content",
  "contactId": "contact-uuid",
  "workspaceId": "workspace-id",
  "delay": 0,
  "metadata": {
    "source": "campaign",
    "campaignId": "campaign-uuid"
  }
}
```

### For immediate Email sending:
```
POST /api/schedule-email
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "html": "<p>Email content</p>",
  "contactId": "contact-uuid",
  "workspaceId": "workspace-id",
  "delay": 0,
  "metadata": {
    "source": "campaign",
    "campaignId": "campaign-uuid"
  }
}
```

Even though these endpoints have "schedule" in their names, they handle both immediate and delayed sending. When the `delay` parameter is set to 0 or not provided, the message is sent immediately.

## Bulk Sending Capabilities

The system is designed to handle bulk sending operations efficiently, such as broadcasting to 2000 contacts at once.

### Batch Processing Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Bulk Request   │────▶│  Queue Jobs     │────▶│  Group by       │
│  (2000 contacts)│     │  (Individual)   │     │  Workspace      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  External API   │◀────│  Process with   │◀────│  Create         │
│  (Twilio, etc.) │     │  Rate Limiting  │     │  Batches        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Features

- **Batch Processing**: Processes multiple SMS or email jobs in a single batch
- **Workspace Grouping**: Groups messages by workspace for better organization
- **Parallel Processing**: Each workspace's messages are processed in parallel
- **Rate Limiting**: Controls the number of requests per second to external APIs
- **Metrics Tracking**: Monitors batch processing performance

### Configuration

The batch processing system is configured with these parameters:

#### SMS Queue
- **Batch Size**: 50 messages per batch
- **Rate Limit**: 50 jobs per second
- **Concurrency**: 5 parallel workers

#### Email Queue
- **Batch Size**: 100 messages per batch
- **Rate Limit**: 100 jobs per second
- **Concurrency**: 5 parallel workers

## Rate Limiting and API Constraints

The system implements rate limiting to respect external API provider limits and ensure reliable delivery.

### Rate Limit Configuration

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────────┐                    ┌─────────────┐     │
│  │             │  50 msgs/second    │             │     │
│  │  SMS Queue  │───────────────────▶│  SMS API    │     │
│  │             │                    │             │     │
│  └─────────────┘                    └─────────────┘     │
│                                                         │
│  ┌─────────────┐                    ┌─────────────┐     │
│  │             │  100 msgs/second   │             │     │
│  │ Email Queue │───────────────────▶│  Email API  │     │
│  │             │                    │             │     │
│  └─────────────┘                    └─────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Processing Time Estimates

For a 2000-contact broadcast:

- **SMS**: Would take approximately 40 seconds minimum (2000 ÷ 50 per second)
- **Email**: Would take approximately 20 seconds minimum (2000 ÷ 100 per second)

The system automatically slows down processing to stay within these limits. If external API rate limits are hit, the system:

1. Detects rate limit errors (HTTP 429 responses)
2. Logs these errors with workspace context
3. Updates metrics to track rate limit exceedances by workspace
4. Continues processing other batches while respecting the rate limits

## Error Handling

The system implements robust error handling, particularly for rate limit errors.

### Rate Limit Error Detection

```javascript
// From sms-worker.ts
const isRateLimitError = errorMessage.includes('rate limit') || 
                         errorMessage.includes('too many requests') || 
                         errorMessage.includes('429');
```

### Workspace-Specific Tracking

The system tracks rate limit exceedances by workspace ID to identify which tenants might be experiencing issues:

```javascript
// Record failed batch with workspace information
const metrics = completeBatchMetrics(
  jobs.length, 
  false, 
  isRateLimitError,
  affectedWorkspaceId,
  errorMessage
);
```

## Monitoring and Metrics

The system provides comprehensive monitoring through:

1. **Bull Board UI**: Available at `/admin/queues`
2. **Metrics API**: Available at `/api/metrics`
3. **Logs**: Detailed console logs for debugging

### Metrics API Endpoints

- **GET /api/metrics**: Get current metrics for SMS and Email batch processing
- **POST /api/metrics/reset**: Reset metrics for a specific type or all types

### Example Metrics Response

```json
{
  "sms": {
    "total": 2000,
    "success": 1950,
    "failed": 50,
    "rateLimited": 45,
    "workspaces": {
      "workspace-123": {
        "total": 500,
        "success": 480,
        "failed": 20,
        "rateLimited": 15
      },
      "workspace-456": {
        "total": 1500,
        "success": 1470,
        "failed": 30,
        "rateLimited": 30
      }
    }
  },
  "email": {
    "total": 2000,
    "success": 1990,
    "failed": 10,
    "rateLimited": 5,
    "workspaces": {
      "workspace-123": {
        "total": 500,
        "success": 495,
        "failed": 5,
        "rateLimited": 2
      },
      "workspace-456": {
        "total": 1500,
        "success": 1495,
        "failed": 5,
        "rateLimited": 3
      }
    }
  },
  "timestamp": "2025-03-25T09:36:53.000Z"
}
```

This monitoring system helps identify problematic tenants, implement fair usage policies, and plan for capacity increases as needed.

## Sender ID / "From" Phone Number

The queue service does not explicitly specify the "from" phone number in the SMS requests. Instead, the system relies on the following approach:

1. **API Configuration**: The "from" phone number is configured at the API level (`${env.SMS_API_URL}/send-sms`), not in the queue service.

2. **Twilio Configuration**: Since the system uses Twilio as the SMS provider, the "from" phone number is typically configured in the Twilio account settings or at the API endpoint that interfaces with Twilio.

3. **Request Format**: When sending an SMS, the queue service only specifies:
   - `to`: The recipient's phone number
   - `message`: The content of the SMS
   - `contactId`: The contact identifier
   - `workspaceId`: The workspace identifier
   - `metadata`: Additional information about the message

4. **Workspace-Based Sender IDs**: For multi-tenant systems, it's common to configure different sender IDs per workspace. This would be handled at the API level, where the `workspaceId` parameter can be used to determine the appropriate "from" number.

### Example Configuration (at API Level)

```javascript
// Example of how the API might handle the "from" number (not in queue service)
app.post('/send-sms', async (req, res) => {
  const { to, message, workspaceId } = req.body;
  
  // Get the appropriate "from" number for this workspace
  const fromNumber = await getWorkspacePhoneNumber(workspaceId);
  
  // Send via Twilio
  const result = await twilioClient.messages.create({
    body: message,
    from: fromNumber, // Workspace-specific sender ID
    to: to
  });
  
  res.json({ success: true, messageId: result.sid });
});
```

This approach allows for flexible configuration of sender IDs without requiring changes to the queue service itself.
