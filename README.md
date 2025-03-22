# BullMQ with BullBoard

[![license mit](https://img.shields.io/badge/licence-MIT-6C47FF)](./LICENSE)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/0s3-xR?referralCode=7y-eBI)

## ✨ Features

- A queueing system with [BullMQ](https://docs.bullmq.io/) and Redis;
- A dashboard built with [bull-board](https://github.com/felixmosh/bull-board) and [Fastify](https://fastify.dev/);
- Run services through [pm2](https://pm2.keymetrics.io/).

## 🚦 Batch Limits Implementation

### 📝 Use Cases

Batch limits in the queue system provide several benefits:

1. **Rate Limiting**: Prevent overwhelming external SMS/Email APIs
2. **Cost Control**: Limit message volume to control expenses
3. **Performance Optimization**: Process messages in optimal batch sizes
4. **API Compliance**: Respect rate limits imposed by service providers
5. **Prioritization**: Process high-priority messages before bulk messages

### 🗂️ Implementation Files

```
queue-services/
├── src/
│   ├── config/
│   │   └── queue.config.ts       # Queue configuration with limiter settings
│   ├── queues/
│   │   ├── email.queue.ts        # Email queue with batch settings
│   │   └── sms.queue.ts          # SMS queue with batch settings  
│   ├── worker/
│   │   ├── index.ts              # Main worker file
│   │   ├── email.worker.ts       # Email worker with batch processing
│   │   └── sms.worker.ts         # SMS worker with batch processing
│   ├── utils/
│   │   └── metrics.ts            # Metrics for monitoring batch performance
│   └── routes/
│       └── metrics.ts            # API endpoints for monitoring batch metrics
├── .env                          # Environment variables for rate limits
└── batch-processing-guide.md     # Comprehensive guide for batch processing
```

### 📈 Basic Implementation Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐     ┌────────────────┐
│ Client App  │────▶│ Queue API        │────▶│ Redis Queues  │────▶│ Queue Workers  │
│ (No changes)│     │ (Same endpoints) │     │ (With limits) │     │ (Batch logic)  │
└─────────────┘     └──────────────────┘     └───────────────┘     └────────────────┘
                                                                           │
                                                                           ▼
                                                                    ┌────────────────┐
                                                                    │ External APIs  │
                                                                    │ (SMS/Email)    │
                                                                    └────────────────┘
```

### 🔑 Key Configuration Parameters

- **Limiter Settings**: Control processing rate
  ```typescript
  limiter: {
    max: 50,        // Maximum jobs per time window (SMS)
    max: 100,       // Maximum jobs per time window (Email)
    duration: 1000, // Time window in milliseconds
  }
  ```

- **Concurrency**: Control parallel processing
  ```typescript
  concurrency: 5,  // Process up to 5 jobs concurrently
  ```

### 📊 Monitoring

The batch processing system can be monitored through:

1. **Bull Board UI**: Available at `/admin/queues`
2. **Metrics API**: Available at `/api/metrics`
3. **Logs**: Check the console logs for detailed information

For more detailed information, see the [Batch Processing Guide](./batch-processing-guide.md).

## 🚀 Install and run the project

### 🌎 Global Dependencies

You need to have a main dependency installed:

- Node.js LTS v18 (or any higher version)

Do you use `nvm`? Then you can run `nvm install` in the project folder to install and use the most appropriate version of Node.js.

### 📦 Local Dependencies

So after getting the repository, don't forget to install the project's local dependencies:

```bash
pnpm install
```

### 📝 Environment variables

Create a `.env` file similar to [`.env.example`](./.env.example).

```env
# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_USER=""
REDIS_PASSWORD=""
```

### 🚀 Run the project

To run the project locally, just run the command below:

```bash
pnpm dev
```

- go to <http://127.0.0.1:3000/ui> to see the dashboard.

## 📚 References and inspirations

- [DkStore](https://github.com/dkshs/dkstore)
- <https://github.com/railwayapp-templates/fastify-bullmq>

## 📜 License

This project is licensed under the **MIT** License - see the [LICENSE](./LICENSE) file for details
