# Email Sending Documentation

## 1. Email Sending Endpoint

```
POST https://cc.automate8.com/api/email/send
```

## 2. Required Fields

### Headers
```json
{
  "Content-Type": "application/json",
  "x-workspace-id": "string"  // Your workspace ID (e.g., "66338")
}
```

### Request Body
```json
{
  "contactId": "string",      // UUID of the contact
  "subject": "string",        // Email subject
  "content": "string",        // Email content (HTML supported)
  "scheduledFor": "string"    // Optional: ISO-8601 date for scheduled emails
}
```

## 3. Sample POST Request

### Using Fetch (JavaScript)
```javascript
const sendEmail = async (workspaceId, contactId, subject, content) => {
  try {
    const response = await fetch('https://cc.automate8.com/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId
      },
      body: JSON.stringify({
        contactId,
        subject,
        content
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Usage Example
sendEmail(
  '66338',
  '289d0731-d103-4042-92fa-1530d3cd8c02',
  'Welcome to Our Platform',
  '<h1>Welcome!</h1><p>Thank you for joining us.</p>'
);
```

### Using cURL
```bash
curl -X POST 'https://cc.automate8.com/api/email/send' \
  -H 'Content-Type: application/json' \
  -H 'x-workspace-id: 66338' \
  -d '{
    "contactId": "289d0731-d103-4042-92fa-1530d3cd8c02",
    "subject": "Welcome to Our Platform",
    "content": "<h1>Welcome!</h1><p>Thank you for joining us.</p>"
  }'
```

## 4. Database Information

### Required Tables and Fields

1. **contacts** table
   - Used to get recipient email address
   ```sql
   SELECT email, name FROM contacts WHERE id = :contactId;
   ```

2. **workspace_email_config** table
   - Contains email configuration for each workspace
   ```sql
   SELECT * FROM workspace_email_config WHERE workspace_id = :workspaceId;
   ```

3. **email_activities** table
   - Records all email activities
   - Fields:
     - workspace_id
     - contact_id
     - subject
     - content
     - status ('sent' or 'scheduled')
     - message_id
     - from_email
     - to_email
     - scheduled_for
     - sent_at

## 5. Supabase Endpoints and Variables

### Environment Variables
```javascript
const SUPABASE_URL = 'https://ycwttshvizkotcwwyjpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g';
```

### Fetch Contact Information
```javascript
const getContact = async (contactId) => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}&select=email,name`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  return response.json();
};
```

### Fetch Workspace Email Config
```javascript
const getWorkspaceConfig = async (workspaceId) => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/workspace_email_config?workspace_id=eq.${workspaceId}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  return response.json();
};
```

### Record Email Activity
```javascript
const recordEmailActivity = async (activityData) => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/email_activities`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    }
  );
  return response.json();
};
```

## Response Format

### Success Response
```json
{
  "id": "resend_1234567890",        // Resend message ID
  "activityId": "uuid-v4-string"     // Email activity record ID
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

## Notes
- The sender email will be `hello@customerconnects.app`
- All emails are logged in the `email_activities` table
- The domain `customerconnects.app` is verified in Resend
- Email content supports HTML formatting
- Scheduled emails use ISO-8601 date format 