# Queue Services - Instructions

## Project Overview

This project implements a robust job queueing system using BullMQ and Redis. It provides a way to process background jobs asynchronously, with features like job scheduling, retries, and monitoring through the Bull Board UI. The system currently supports email and SMS message queues with both immediate and scheduled delivery options.

## Core Functionalities

- **Job Queueing**: Add jobs to queues for asynchronous processing
- **Job Scheduling**: Schedule jobs to run at a specific time in the future
- **Job Monitoring**: Monitor job status through the Bull Board UI
- **Error Handling**: Retry failed jobs with exponential backoff
- **Queue Management**: Manage queues and jobs through the Bull Board UI
- **Email Sending**: Process and send emails asynchronously
- **SMS Sending**: Process and send SMS messages with immediate or scheduled delivery

## Environment Setup

### Required Environment Variables

```
API_URL=https://cc.automate8.com
BULL_BOARD_PASSWORD=admin123
BULL_BOARD_USERNAME=admin
FRONTEND_URL=https://cc1.automate8.com
HOST=0.0.0.0
NODE_ENV=production
PORT=3000
REDIS_HOST=redis.railway.internal
REDIS_PASSWORD=fbYziATslDdWOVGqlpsXPZThAwbSzbgz
REDIS_PORT=6379
SUPABASE_ANON_KEY=(provided)
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
```

### Local Development

For local development, the application will use the Railway proxy to connect to Redis:
- Proxy Host: `caboose.proxy.rlwy.net`
- Proxy Port: `58064`

## Testing

Several test scripts are available to test different aspects of the application:

- `pnpm test:queues`: Test local queue functionality
- `pnpm test:railway`: Test remote queue functionality on Railway
- `pnpm test:direct`: Test direct connection to a Redis instance
- `pnpm test:connections`: Comprehensive test for various Redis connections
- `pnpm test:bull-board`: Test Bull Board UI connectivity and job management
- `pnpm test:redis-config`: Test Redis connection configurations
- `pnpm test:proxy-jobs`: Test adding jobs to queues using the Railway proxy
- `pnpm test:sms-queues`: Test adding jobs to SMS queues

## Current File Structure

```
queue-services/
├── dist/                  # Compiled output
├── src/
│   ├── index.ts           # Main entry point
│   ├── env.ts             # Environment variables
│   ├── queues/
│   │   ├── configs.ts     # Queue configuration
│   │   ├── email-queue.ts # Email queue definition
│   │   ├── my-queue.ts    # Generic queue definition
│   │   ├── sms-queue.ts   # SMS queue definition
│   │   ├── schemas/
│   │   │   └── sms-schema.ts # SMS data schema
│   │   ├── schemas.ts     # Job data schemas
│   │   └── utils.ts       # Queue utilities
│   ├── worker/
│   │   ├── index.ts       # Worker entry point
│   │   ├── email-worker.ts # Email worker
│   │   ├── my-worker.ts   # Generic worker
│   │   └── sms-worker.ts  # SMS worker
│   └── test-*.ts          # Various test scripts
├── rslib.config.ts        # Build configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── ecosystem.config.cjs   # PM2 configuration
```

## Running the Application

### Start the Server

```bash
pnpm build
pnpm start:server
```

### Start the Worker

```bash
pnpm build
pnpm start:worker
```

### Development Mode

```bash
pnpm dev
```

## Accessing the Bull Board UI

The Bull Board UI is available at `/admin/queues` with the following credentials:
- Username: `admin`
- Password: `admin123`

## Available Queues

1. **my-queue**: Generic queue for testing and demonstration
2. **send-email-queue**: Queue for processing and sending emails
3. **send-sms-queue**: Queue for immediate SMS delivery
4. **scheduled-sms-queue**: Queue for scheduled SMS delivery

## Adding Jobs to Queues

### Email Example

```typescript
import { sendEmailQueue } from "./queues/email-queue";

await sendEmailQueue.add("send-email", {
  email: "recipient@example.com",
  subject: "Test Email",
  text: "This is a test email"
});
```

### SMS Example

```typescript
import { addSMSJob } from "./queues/sms-queue";

// Immediate delivery
await addSMSJob({
  phoneNumber: "+1234567890",
  message: "This is a test SMS"
});

// Scheduled delivery
await addSMSJob({
  phoneNumber: "+1234567890",
  message: "This is a scheduled SMS",
  scheduledFor: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
});
