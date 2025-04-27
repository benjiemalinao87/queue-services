# Queue Service Integration for AI Auto-Responder

## Overview

We've updated our AI Auto-Responder architecture to properly integrate with the Queue Services. This document provides implementation instructions for the Queue Service team.

## Integration Requirements

### 1. Database Access

The Queue Service needs to access our `ai_response_queue` table in Supabase using Supabase Realtime subscription.

```
Database: https://ycwttshvizkotcwwyjpt.supabase.co
Table: ai_response_queue
```

### 2. Realtime Subscription

Implement a Supabase Realtime subscription that:

- Listens for INSERT events on the `ai_response_queue` table
- Processes new jobs immediately when they are added
- Updates status to "processing" when picking up a job
- Handles rate limiting and retries
- Is more responsive than polling-based approaches

### 3. Subscription Setup

```javascript
// Example Supabase Realtime subscription
const channel = supabase
  .channel('ai-responder-queue')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'ai_response_queue',
      filter: 'status=eq.pending'
    },
    (payload) => {
      console.log('New job received:', payload.new);
      // Process job immediately
      processJob(payload.new);
    }
  )
  .subscribe();
```

When processing a job, update its status:

```sql
UPDATE ai_response_queue
SET status = 'processing', attempts = attempts + 1
WHERE id = '<job_id>';
```

### 4. API Endpoints

#### Generate AI Response

Call our new endpoint to generate the AI response:

```
POST https://cc.automate8.com/api/ai/generate-response
Content-Type: application/json

{
  "workspace_id": "<workspace_id>",
  "contact_id": "<contact_id>",
  "message_id": "<message_id>"
}
```

Response format:

```json
{
  "success": true,
  "response": "AI-generated text response",
  "logId": "uuid-of-log-entry",
  "model": "gpt-4o",
  "tokens": 150,
  "contact": {
    "id": "contact-uuid",
    "phone": "+1234567890"
  }
}
```

#### Send SMS

After generating the response, send it via our existing SMS endpoint:

```
POST https://cc.automate8.com/send-sms
Content-Type: application/json

{
  "to": "<contact_phone>",
  "message": "<ai_generated_response>",
  "workspaceId": "<workspace_id>",
  "contactId": "<contact_id>",
  "metadata": {
    "contactId": "<contact_id>",
    "isAiGenerated": true,
    "aiLogId": "<log_id>"
  }
}
```

### 5. Job Completion

After successful processing, update the job:

```sql
UPDATE ai_response_queue
SET 
  status = 'complete',
  processed_at = NOW()
WHERE id = '<job_id>';
```

### 6. Error Handling

If errors occur, update the job:

```sql
UPDATE ai_response_queue
SET 
  status = 'error',
  error = '<error_message>'
WHERE id = '<job_id>';
```

Implement retry logic:
- Maximum 3 attempts per job
- Exponential backoff (e.g., 5s, 25s, 125s)
- After max attempts, mark as "failed"

### 7. Rate Limiting

To prevent overloading our systems:
- Maximum 10 concurrent jobs
- Maximum 60 jobs per minute
- Use composite rate limit keys: `${workspace_id}:${contact_id}`
- Maximum 5 messages per minute to the same contact

### 8. Monitoring

- Implement metrics for job processing time, success/failure rates
- Add logging for each processing step
- Set up alerts for high error rates or queue backlogs

## Testing Instructions

1. Send an inbound message to the system
2. Verify entry appears in `ai_response_queue` with status "pending"
3. Wait for queue service to process the entry
4. Verify job status changes to "processing" then "complete"
5. Check for the outbound message in `livechat_messages`
6. Verify the contact receives the SMS response

## Architecture Diagram

```
┌─────────────┐    ┌────────────┐    ┌───────────────┐
│             │    │            │    │               │
│   Contact   │───►│   Twilio   │───►│ Main Backend  │
│             │    │            │    │               │
└─────────────┘    └────────────┘    └───────┬───────┘
                                             │
                                             │ ai_response_queue
                                             ▼
┌─────────────┐    ┌────────────┐    ┌───────────────┐
│             │    │            │    │               │
│  Queue      │◄───┤  Supabase  │◄───┤ Database      │
│  Service    │    │  Realtime  │    │               │
│             │    │            │    │               │
└─────┬───────┘    └────────────┘    └───────────────┘
      │
      │ API Call
      ▼
┌─────────────┐    
│             │    
│ /api/ai/gen │    
│             │    
└─────┬───────┘    
      │
      │ Response
      ▼
┌─────────────┐    ┌────────────┐    ┌───────────────┐
│             │    │            │    │               │
│   Twilio    │◄───┤ /send-sms  │◄───┤ Queue Service │
│             │    │            │    │               │
└─────────────┘    └────────────┘    └───────────────┘
      │
      │
      ▼
┌─────────────┐
│             │
│   Contact   │
│             │
└─────────────┘
```

## Contact

For any questions or assistance with this integration, please contact [Your Name] at [Your Email/Slack].
