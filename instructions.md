# Queue Services - Integration Guide

## Project Overview

This project implements a robust job queueing system using BullMQ and Redis. It provides a way to process background jobs asynchronously, with features like job scheduling, retries, and monitoring through the Bull Board UI. The system currently supports email and SMS message queues with both immediate and scheduled delivery options.

## System Architecture

```
┌─────────────────┐     1. Schedule Message     ┌─────────────────┐
│                 │ ─────────────────────────>  │                 │
│  Your Frontend  │                             │  Queue Services │
│  (React App)    │                             │     (API)       │
│                 │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │                 │
└─────────────────┘     2. Return Job ID        └────────┬────────┘
                                                         │
                                                         │ 3. Store in Queue
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │  Redis Queue    │
                                                │                 │
                                                └────────┬────────┘
                                                         │
                                                         │ 4. Process at
                                                         │    scheduled time
                                                         ▼
┌─────────────────┐     5. Send Message        ┌─────────────────┐
│                 │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │                 │
│  Your Backend   │                             │  Queue Services │
│  (API Server)   │                             │    (Worker)     │
│                 │ ─────────────────────────>  │                 │
└─────────────────┘     6. Return Status        └─────────────────┘
        │
        │ 7. Send SMS/Email
        ▼
┌─────────────────┐
│                 │
│  Twilio/Email   │
│    Provider     │
│                 │
└─────────────────┘
```

### How It Works: Detailed Flow Explanation

#### Initial Message Scheduling

1. **Schedule Message**: 
   - Your frontend application (campaign UI) or backend server makes an HTTP POST request to the Queue Services API
   - The request includes message details (phone number, content), contact information, and delay time
   - Example: When a user activates a campaign, your app calculates when each message should be sent and calls the scheduling API

2. **Return Job ID**: 
   - Queue Services validates the request and generates a unique job ID
   - This job ID is returned immediately to your application
   - Your application should store this job ID to track the message status later
   - Example: Your app stores the job ID in your database, associated with the campaign message

#### Background Processing

3. **Store in Queue**: 
   - Queue Services stores the job in Redis with all message details
   - The job is configured with the specified delay time
   - Redis ensures the job persists even if the Queue Services restarts
   - Example: A message scheduled for 3 days later is stored with a 259,200,000 ms delay

4. **Process at Scheduled Time**: 
   - When the delay time expires, the job becomes active
   - A Queue Services worker picks up the job for processing
   - The worker runs 24/7, continuously checking for jobs that are ready to be processed
   - Example: After 3 days, the worker detects that the job's delay has expired

#### Message Delivery

5. **Send Message**: 
   - The Queue Services worker calls your backend API with the message details
   - This call includes all original data plus the job ID for tracking
   - Your backend API receives this as a normal HTTP request
   - Example: Queue Services calls your `/send-sms` endpoint with the message content and recipient

6. **Return Status**: 
   - Your backend processes the request and attempts to send the message
   - It returns a success/failure status to the Queue Services worker
   - If the call fails, Queue Services can retry based on configured retry settings
   - Example: Your API returns a 200 OK response with details of the sent message

7. **Send SMS/Email**: 
   - Your backend uses your existing Twilio integration to send the SMS
   - Your backend has full control over the actual message sending process
   - This leverages your existing Twilio configuration and credentials
   - Example: Your backend calls Twilio's API to send the SMS to the recipient's phone number

#### Benefits of This Architecture

- **Separation of Concerns**: Queue Services handles scheduling and reliability, while your backend handles message sending
- **Minimal Changes**: Your existing Twilio integration remains unchanged
- **Multi-tenant Support**: Each workspace can maintain its own Twilio configuration
- **Timezone Handling**: Your application controls the timezone calculations
- **Visibility**: The Bull Board UI provides complete visibility into scheduled and processed jobs

## Core Functionalities

- **Job Queueing**: Add jobs to queues for asynchronous processing
- **Job Scheduling**: Schedule jobs to run at a specific time in the future
- **Job Monitoring**: Monitor job status through the Bull Board UI
- **Error Handling**: Retry failed jobs with exponential backoff
- **Queue Management**: Manage queues and jobs through the Bull Board UI
- **Email Sending**: Process and send emails asynchronously
- **SMS Sending**: Process and send SMS messages with immediate or scheduled delivery

## Implementation Status

### Current Implementation

The Queue Services system currently has the following functionality implemented:

#### SMS Functionality (Complete)

- ✅ `/api/schedule-sms` endpoint for scheduling SMS messages
- ✅ Immediate and delayed SMS queues
- ✅ Workers for processing SMS jobs
- ✅ Callback mechanism to your backend API

The SMS functionality is fully implemented and ready to use. The system will call back to your backend API at the endpoint specified in the `SMS_API_URL` environment variable (e.g., `${SMS_API_URL}/send-sms`).

#### Email Functionality (Complete)

- ✅ `/api/schedule-email` endpoint for scheduling email messages
- ✅ Immediate and delayed email queues
- ✅ Workers for processing email jobs
- ✅ Callback mechanism to your backend API

The email functionality is fully implemented and ready to use. The system will call back to your backend API at the endpoint specified in the `EMAIL_API_URL` environment variable (e.g., `${EMAIL_API_URL}/api/email/send`).

### Testing Email Functionality

You can test the email scheduling functionality using the provided test UI:

1. Open your browser and navigate to `/test-email`
2. Fill in the form with the email details:
   - Recipient Email: The email address to send to
   - Subject: The email subject
   - Email Content: HTML content for the email
   - Contact ID: The ID of the contact in your system
   - Workspace ID: The ID of the workspace
   - Delay: Time in milliseconds to delay the email (0 for immediate)
3. Click "Schedule Email" to submit the request
4. The response will be displayed below the form

## Integration Guide for Existing Application

This guide will help you integrate with the Queue Services API from your existing application. The Queue Services will be used as a standalone service for handling all queued jobs, while your application will handle the UI and direct API calls.

### 1. Understanding the Architecture

Based on the Railway deployment (Image 1), we have:

- **Frontend**: `cc1.automate8.com` - Your React application
- **Backend**: `cc.automate8.com` - Your API server
- **Queue Services**: `queue-services-production.up.railway.app` - The dedicated queue service

The Queue Services will handle all job queueing, scheduling, and processing, while your application will continue to handle direct API calls and the user interface.

### 2. Available Endpoints

The Queue Services exposes the following endpoints:

#### 2.1 SMS Scheduling Endpoint

```
POST /api/schedule-sms
```

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "message": "Your message here",
  "contactId": "contact-uuid",
  "workspaceId": "workspace-uuid",
  "delay": 60000, // Optional: delay in milliseconds
  "metadata": {    // Optional: additional metadata
    "source": "campaign",
    "campaignId": "campaign-uuid",
    "callbackEndpoint": "/send-sms"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "123",
  "message": "SMS scheduled successfully"
}
```

#### 2.2 Email Scheduling Endpoint

```
POST /api/schedule-email
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Your email subject",
  "html": "<h1>Hello!</h1><p>This is your email content.</p>",
  "contactId": "contact-uuid",
  "workspaceId": "workspace-uuid",
  "delay": 60000, // Optional: delay in milliseconds
  "metadata": {    // Optional: additional metadata
    "source": "campaign",
    "campaignId": "campaign-uuid",
    "callbackEndpoint": "/api/email/send"
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "123",
  "message": "Email scheduled successfully"
}
```

#### 2.3 Bull Board UI

```
GET /admin/queues
```

The Bull Board UI is protected with basic authentication. Use the credentials provided in the environment variables.

### 3. Integrating with Your Campaign UI

Based on your campaign UI (images 2-5), you'll need to modify your campaign execution logic to use the Queue Services API:

#### 3.1 Campaign Message Scheduling

Update your campaign message scheduling code to use the Queue Services API:

```typescript
import axios from 'axios';

// Example function to schedule a campaign message
async function scheduleCampaignMessage(message, contactData, scheduledTime) {
  const scheduledTimestamp = new Date(scheduledTime).getTime();
  const currentTime = Date.now();
  const delayMs = Math.max(0, scheduledTimestamp - currentTime);
  
  // Prepare metadata
  const metadata = {
    source: "campaign",
    campaignId: message.campaignId,
    messageId: message.id,
    scheduledTime: scheduledTime,
    timestamp: new Date().toISOString(),
    // Include the callback endpoint for the Queue Services to use
    callbackEndpoint: message.type === "SMS" ? "/send-sms" : "/api/email/send"
  };
  
  if (message.type === "SMS") {
    // Call the Queue Services API to schedule an SMS
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-sms', {
      phoneNumber: contactData.phoneNumber,
      message: message.content,
      contactId: contactData.id,
      workspaceId: contactData.workspaceId,
      delay: delayMs,
      metadata
    });
    
    return response.data;
  } else if (message.type === "Email") {
    // Call the Queue Services API to schedule an Email
    const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-email', {
      to: contactData.email,
      subject: message.subject,
      html: message.content,
      contactId: contactData.id,
      workspaceId: contactData.workspaceId,
      delay: delayMs,
      metadata
    });
    
    return response.data;
  }
}
```

#### 3.2 Campaign Activation

When a campaign is activated (as shown in image 3 with the "ACTIVE" status), you'll need to schedule all messages:

```typescript
// Example function to activate a campaign
async function activateCampaign(campaignId) {
  // Get campaign data
  const campaign = await getCampaignById(campaignId);
  
  // Get contacts for this campaign
  const contacts = await getContactsForCampaign(campaignId);
  
  // Schedule all messages for all contacts
  for (const contact of contacts) {
    for (const message of campaign.messages) {
      // Calculate scheduled time based on campaign settings
      const scheduledTime = calculateMessageScheduledTime(campaign, message, contact);
      
      // Schedule the message
      const result = await scheduleCampaignMessage(message, contact, scheduledTime);
      
      // Store the job ID for tracking
      await storeJobId(message.id, contact.id, result.jobId);
    }
  }
  
  // Update campaign status
  await updateCampaignStatus(campaignId, "ACTIVE");
}
```

### 4. Tracking Job Status

To track the status of scheduled messages, you can store the job IDs returned by the Queue Services API and periodically check their status:

```typescript
// Example function to check job status
async function checkJobStatus(jobId) {
  try {
    const response = await axios.get(`https://queue-services-production.up.railway.app/api/job-status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error(`Error checking job status: ${error}`);
    return { success: false, error: error.message };
  }
}
```

### 5. Handling Failures

If a job fails, you can implement a webhook to receive notifications:

```typescript
// Example webhook handler
app.post('/api/queue-webhook', (req, res) => {
  const { jobId, status, error } = req.body;
  
  if (status === 'failed') {
    // Handle failed job
    handleFailedJob(jobId, error);
  }
  
  res.status(200).send({ received: true });
});
```

### 6. Testing the Integration

1. Create a test campaign with a few messages
2. Activate the campaign
3. Check the Bull Board UI to see if jobs were added to the queues
4. Monitor the job status to ensure messages are being sent at the scheduled times

## Queue Services System Overview

This section provides a detailed overview of the Queue Services system for interns and new team members.

### 1. Queue System Architecture

The Queue Services system is built using the following technologies:

- **BullMQ**: A Redis-based queue system for Node.js
- **Redis**: An in-memory data structure store used as a database, cache, and message broker
- **Fastify**: A web framework for Node.js
- **Bull Board**: A UI dashboard for BullMQ

The system follows a producer-consumer architecture:

1. **Producers**: API endpoints that add jobs to queues
2. **Queues**: Redis-backed queues that store jobs
3. **Consumers (Workers)**: Processes that execute jobs from queues

### 2. Available Queues

The system currently has the following queues:

1. **my-queue**: A general-purpose queue for testing
2. **send-email-queue**: Queue for processing and sending emails
3. **send-sms-queue**: Queue for immediate SMS delivery
4. **scheduled-sms-queue**: Queue for scheduled SMS delivery

### 3. Job Lifecycle

Each job in the queue goes through the following lifecycle:

1. **Added**: Job is added to the queue
2. **Waiting**: Job is waiting to be processed
3. **Active**: Job is being processed by a worker
4. **Completed**: Job has been successfully processed
5. **Failed**: Job has failed and may be retried
6. **Delayed**: Job is scheduled for future processing

### 4. Bull Board UI

The Bull Board UI provides a visual interface for monitoring and managing queues and jobs. It can be accessed at:

```
https://queue-services-production.up.railway.app/admin/queues
```

The UI provides the following features:

- **Queue Overview**: View all queues and their status
- **Job Status**: View the status of all jobs in a queue
- **Job Details**: View detailed information about a job
- **Job Management**: Retry, remove, or promote jobs
- **Queue Statistics**: View queue statistics such as job counts and processing times

### 5. Monitoring and Troubleshooting

#### 5.1 Common Issues

- **Failed Jobs**: Jobs may fail due to network issues, invalid data, or errors in the worker code
- **Stalled Jobs**: Jobs that have been active for too long without completing
- **Delayed Jobs Not Processing**: Jobs scheduled for future processing not being executed

#### 5.2 Monitoring Strategies

- Regularly check the Bull Board UI for failed jobs
- Set up alerts for failed jobs
- Monitor Redis memory usage
- Check worker logs for errors

#### 5.3 Troubleshooting Steps

1. Check the job data to ensure it's valid
2. Check the worker logs for errors
3. Verify Redis connection is stable
4. Check for network issues between the Queue Services and external APIs
5. Retry failed jobs manually through the Bull Board UI

### 6. Best Practices

- Always include proper error handling in worker code
- Set appropriate retry strategies for different types of jobs
- Monitor queue sizes to prevent memory issues
- Implement proper logging for debugging
- Use job events to track job progress
- Set appropriate job timeouts to prevent stalled jobs

### 7. Scaling Considerations

- Redis can be a bottleneck for high-volume queues
- Consider using multiple workers for high-volume queues
- Monitor Redis memory usage and consider sharding for very large queues
- Use job prioritization for critical jobs

## Handling Different Timezones

Since your application is a multi-tenant SaaS where users may be in different timezones (PST, EST, CST, Australia, etc.), you'll need to implement timezone handling when scheduling messages. The Queue Services system uses UTC time internally, but you can adapt it for different timezones:

### 1. Store Timezone Information

- Store each workspace's timezone in your database (e.g., "America/New_York", "Australia/Sydney")
- Allow users to set their preferred timezone in their workspace settings

### 2. Calculate Correct Delay

When scheduling messages, convert the user's local time to UTC before calculating the delay:

```typescript
// Example function that handles timezone conversion
async function scheduleCampaignMessage(message, contactData, scheduledLocalTime, workspaceTimezone) {
  // Convert the user's local scheduled time to a Date object in their timezone
  const userLocalTime = new Date(scheduledLocalTime);
  
  // Convert to UTC time (which is what the queue system uses)
  const scheduledUtcTime = new Date(
    moment.tz(userLocalTime, workspaceTimezone).utc().format()
  );
  
  // Calculate delay in milliseconds from now
  const currentUtcTime = new Date();
  const delayMs = Math.max(0, scheduledUtcTime.getTime() - currentUtcTime.getTime());
  
  // Include timezone information in metadata for reference
  const metadata = {
    source: "campaign",
    campaignId: message.campaignId,
    messageId: message.id,
    scheduledLocalTime: scheduledLocalTime,
    workspaceTimezone: workspaceTimezone,
    scheduledUtcTime: scheduledUtcTime.toISOString()
  };
  
  // Call the Queue Services API with the calculated delay
  const response = await axios.post('https://queue-services-production.up.railway.app/api/schedule-sms', {
    phoneNumber: contactData.phoneNumber,
    message: message.content,
    contactId: contactData.id,
    workspaceId: contactData.workspaceId,
    delay: delayMs,
    metadata
  });
  
  return response.data;
}
```

### 3. Display Times in User's Timezone

- When showing scheduled message times in the UI, convert UTC times back to the user's timezone
- Use a library like moment-timezone for reliable conversions

### 4. Implementation Steps

1. **Add Timezone Field**:
   - Add a timezone field to your workspace settings table
   - Default to UTC if not specified

2. **Update Campaign UI**:
   - Add timezone information to the campaign scheduling interface
   - Display all times in the user's selected timezone

3. **Modify Integration Code**:
   - Update your integration code to convert between local time and UTC
   - Include timezone information in the metadata when scheduling messages

### 5. Example Implementation

```typescript
// In your campaign activation function
async function activateCampaign(campaignId) {
  // Get campaign data
  const campaign = await getCampaignById(campaignId);
  
  // Get workspace settings including timezone
  const workspace = await getWorkspaceById(campaign.workspaceId);
  const workspaceTimezone = workspace.timezone || "UTC";
  
  // Get contacts for this campaign
  const contacts = await getContactsForCampaign(campaignId);
  
  // Schedule all messages for all contacts
  for (const contact of contacts) {
    for (const message of campaign.messages) {
      // Calculate scheduled time based on campaign settings in workspace timezone
      const localScheduledTime = calculateMessageScheduledTime(campaign, message, contact);
      
      // Schedule the message with timezone handling
      const result = await scheduleCampaignMessage(
        message, 
        contact, 
        localScheduledTime, 
        workspaceTimezone
      );
      
      // Store the job ID for tracking
      await storeJobId(message.id, contact.id, result.jobId);
    }
  }
  
  // Update campaign status
  await updateCampaignStatus(campaignId, "ACTIVE");
}
```

This approach ensures that messages are scheduled at the correct time according to each workspace's timezone, which is crucial for a multi-tenant SaaS application with users across different time zones.

## Configuring Callback Endpoints

The Queue Services needs to know which endpoint to call when it's time to send a message. There are two ways to handle this:

#### Option 1: Include Callback Endpoint in Metadata (Recommended)

When scheduling a message, include the callback endpoint in the metadata:

```typescript
const metadata = {
  // Other metadata...
  callbackEndpoint: "/send-sms" // or "/api/email/send"
};
```

The Queue Services will use this endpoint to call back to your backend when it's time to send the message. This approach allows you to use different endpoints for different message types or even different campaigns.

#### Option 2: Configure in Queue Services

The Queue Services can be configured with default endpoints for each message type. These would be set in the Queue Services environment variables:

```
SMS_CALLBACK_ENDPOINT=/send-sms
EMAIL_CALLBACK_ENDPOINT=/api/email/send
```

If no callback endpoint is specified in the metadata, the Queue Services will use these default endpoints.

#### Callback URL Construction

The full callback URL is constructed as follows:

```
${YOUR_BACKEND_API_URL}${callbackEndpoint}
```

For example, if your backend API URL is `https://api.yourdomain.com` and the callback endpoint is `/send-sms`, the Queue Services will call:

```
https://api.yourdomain.com/send-sms
```

You'll need to ensure that:

1. Your backend API URL is configured in the Queue Services environment variables
2. The specified endpoints are implemented in your backend API
3. The endpoints accept the message data in the format provided by Queue Services

## Environment Variables

The Queue Services system uses the following environment variables:

```
REDIS_HOST=localhost
REDIS_PORT=6379
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=admin123
SMS_API_URL=https://cc.automate8.com
EMAIL_API_URL=https://cc.automate8.com
PORT=3000
HOST=0.0.0.0
```

## API Testing

You can test the API endpoints directly using curl:

### Testing SMS Scheduling

```bash
# Send an immediate SMS
curl -X POST https://queue-services-production.up.railway.app/api/schedule-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "This is a test SMS",
    "contactId": "123456",
    "workspaceId": "66338",
    "delay": 0
  }'

# Schedule an SMS for 1 minute later
curl -X POST https://queue-services-production.up.railway.app/api/schedule-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "This is a scheduled test SMS",
    "contactId": "123456",
    "workspaceId": "66338",
    "delay": 60000
  }'
```

### Testing Email Scheduling

```bash
# Send an immediate email
curl -X POST https://queue-services-production.up.railway.app/api/schedule-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>",
    "contactId": "123456",
    "workspaceId": "66338",
    "delay": 0
  }'

# Schedule an email for 1 minute later
curl -X POST https://queue-services-production.up.railway.app/api/schedule-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Scheduled Test Email",
    "html": "<p>This is a scheduled test email</p>",
    "contactId": "123456",
    "workspaceId": "66338",
    "delay": 60000
  }'
```

### Accessing the Bull Board UI

You can access the Bull Board UI to monitor queues and jobs at:

```
https://queue-services-production.up.railway.app/admin/queues
```

Use the credentials specified in the environment variables (default: admin/admin123).

## Conclusion

By integrating with the Queue Services API, your application gains:

1. **Reliability**: Messages will be delivered even if there are temporary issues with the SMS/Email provider
2. **Scalability**: The system can handle a large number of messages without overwhelming your application
3. **Scheduling**: Messages can be scheduled for future delivery
4. **Monitoring**: The Bull Board UI provides visibility into the queue system
5. **Error Handling**: Failed jobs can be retried automatically

This integration is particularly valuable for your campaign management system, where reliable message delivery at specific times is critical for success.
