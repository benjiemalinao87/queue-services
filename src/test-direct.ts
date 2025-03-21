import { Queue } from 'bullmq';
import axios from 'axios';
import IORedis from "ioredis";

// Connection configuration for the direct Redis instance
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

// Create queue instances
const myQueue = new Queue('my-queue', { connection: redisConfig });
const sendEmailQueue = new Queue('send-email-queue', { connection: redisConfig });

async function testDirectConnection() {
  console.log("=== Testing Direct Connection to Redis ===");
  console.log("Redis Host:", redisConfig.host);
  
  try {
    // Test Bull Board UI
    console.log("\n--- Testing Bull Board UI Connection ---");
    try {
      const response = await axios.get('https://queue-services-production.up.railway.app/ui', {
        auth: {
          username: 'admin',
          password: 'admin123'
        }
      });
      console.log(`✅ Successfully connected to Bull Board UI (Status: ${response.status})`);
    } catch (error) {
      console.error(`❌ Failed to connect to Bull Board UI: ${error.message}`);
      console.log("Continuing with queue tests anyway...");
    }
    
    // Test regular jobs
    console.log("\n--- Testing Regular Jobs ---");
    
    // Add a job to myQueue
    try {
      const myJob = await myQueue.add('direct-test-job', {
        data: "This is a direct test job",
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ Added regular job to myQueue with ID: ${myJob.id}`);
    } catch (error) {
      console.error(`❌ Failed to add job to myQueue: ${error.message}`);
    }
    
    // Add a job to sendEmailQueue
    try {
      const emailJob = await sendEmailQueue.add('direct-test-email', {
        email: "test@example.com",
        subject: "Direct Test Email",
        text: "This is a test email sent from the direct connection.",
      });
      console.log(`✅ Added regular job to sendEmailQueue with ID: ${emailJob.id}`);
    } catch (error) {
      console.error(`❌ Failed to add job to sendEmailQueue: ${error.message}`);
    }
    
    // Test scheduled jobs
    console.log("\n--- Testing Scheduled Jobs ---");
    
    // Schedule a job for myQueue
    try {
      const scheduledMyJob = await myQueue.add(
        'direct-scheduled-job',
        {
          data: "This is a scheduled job via direct connection",
          timestamp: new Date().toISOString(),
        },
        {
          delay: 30000, // 30 seconds
        }
      );
      console.log(`✅ Added scheduled job to myQueue with ID: ${scheduledMyJob.id}, will run in 30 seconds`);
    } catch (error) {
      console.error(`❌ Failed to add scheduled job to myQueue: ${error.message}`);
    }
    
    // Schedule a job for sendEmailQueue
    try {
      const scheduledEmailJob = await sendEmailQueue.add(
        'direct-scheduled-email',
        {
          email: "test@example.com",
          subject: "Direct Scheduled Test Email",
          text: "This is a test email scheduled via direct connection.",
        },
        {
          delay: 60000, // 1 minute
        }
      );
      console.log(`✅ Added scheduled job to sendEmailQueue with ID: ${scheduledEmailJob.id}, will run in 1 minute`);
    } catch (error) {
      console.error(`❌ Failed to add scheduled job to sendEmailQueue: ${error.message}`);
    }
    
    // Test recurring jobs
    console.log("\n--- Testing Recurring Jobs ---");
    
    // Add a recurring job to myQueue
    try {
      const recurringMyJob = await myQueue.add(
        'direct-recurring-job',
        {
          data: "This is a recurring job via direct connection",
          timestamp: new Date().toISOString(),
        },
        {
          repeat: {
            every: 120000, // 2 minutes
          },
        }
      );
      console.log(`✅ Added recurring job to myQueue with ID: ${recurringMyJob.id}, will run every 2 minutes`);
    } catch (error) {
      console.error(`❌ Failed to add recurring job to myQueue: ${error.message}`);
    }
    
    // Add a recurring job to sendEmailQueue
    try {
      const recurringEmailJob = await sendEmailQueue.add(
        'direct-recurring-email',
        {
          email: "test@example.com",
          subject: "Direct Recurring Test Email",
          text: "This is a recurring test email via direct connection.",
        },
        {
          repeat: {
            every: 180000, // 3 minutes
          },
        }
      );
      console.log(`✅ Added recurring job to sendEmailQueue with ID: ${recurringEmailJob.id}, will run every 3 minutes`);
    } catch (error) {
      console.error(`❌ Failed to add recurring job to sendEmailQueue: ${error.message}`);
    }
    
    console.log("\n✅ Test job submission completed!");
    console.log("You can check the Bull Board UI to see the jobs in the queues:");
    console.log("URL: https://queue-services-production.up.railway.app/ui");
    console.log("Username: admin");
    console.log("Password: admin123");
    
  } catch (error) {
    console.error("❌ Error testing direct connection:", error);
  } finally {
    // Close the connections
    try {
      await myQueue.close();
      await sendEmailQueue.close();
      console.log("Queue connections closed");
    } catch (error) {
      console.error("❌ Error closing queue connections:", error);
    }
  }
}

// Run the test
testDirectConnection().catch(console.error);
