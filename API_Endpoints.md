# Queue Service API Endpoints

Base URL: `https://cc.automate8.com`

## SMS Endpoints

### Send Immediate SMS
- **URL**: `/api/schedule-sms`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "phoneNumber": "+14345054099",
  "message": "Hello",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "metadata": {
    "source": "broadcast2"
  }
}
```

### Schedule Delayed SMS
- **URL**: `/api/schedule-sms`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "phoneNumber": "+14345054099",
  "message": "Hello",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "delay": 3600000, // 1 hour delay in milliseconds
  "metadata": {
    "source": "broadcast2",
    "campaignId": "campaign_id",
    "messageId": "message_id",
    "scheduledTime": "2025-03-27T00:20:00.182Z",
    "batchId": "batch_id"
  }
}
```

## Email Endpoints

### Send Immediate Email
- **URL**: `/api/schedule-email`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Email content</p>",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "metadata": {
    "source": "broadcast2",
    "callbackEndpoint": "/api/email/send"
  }
}
```

### Schedule Delayed Email
- **URL**: `/api/schedule-email`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Email content</p>",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "delay": 3600000, // 1 hour delay in milliseconds
  "metadata": {
    "source": "broadcast2",
    "campaignId": "campaign_id",
    "messageId": "message_id",
    "scheduledTime": "2025-03-27T00:20:00.182Z",
    "batchId": "batch_id",
    "callbackEndpoint": "/api/email/send"
  }
}
```

## Response Format

### Success Response
```javascript
{
  "success": true,
  "jobId": "job_id",
  "message": "SMS/Email queued for immediate delivery" // or "SMS/Email scheduled successfully"
}
```

### Error Response
```javascript
{
  "success": false,
  "message": "Error message details"
}
```

## Important Notes

1. All endpoints are CORS-enabled
2. Required fields:
   - SMS: `phoneNumber`, `message`, `contactId`, `workspaceId`
   - Email: `to`, `subject`, `html`, `contactId`, `workspaceId`
3. Optional fields:
   - `delay`: Time in milliseconds to delay the sending
   - `metadata`: Additional information about the message
4. The same endpoint is used for both immediate and delayed sending:
   - Without `delay`: Message is sent immediately
   - With `delay`: Message is scheduled for later
5. Rate Limits:
   - SMS: 50 jobs per second
   - Email: 100 jobs per second

## Example Usage

```javascript
// Using fetch API
fetch('https://cc.automate8.com/api/schedule-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: "+14345054099",
    message: "Hello",
    contactId: "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
    workspaceId: "66338",
    delay: 3600000,
    metadata: {
      source: "broadcast2",
      campaignId: "campaign_id"
    }
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```
