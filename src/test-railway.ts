import { Queue } from 'bullmq';
import axios from 'axios';

// Connection configuration for Railway Redis
const connection = {
  host: 'redis.railway.internal',
  port: 6379,
  username: 'default',
  password: 'fbYziATslDdWOVGqlpsXPZThAwbSzbgz',
};

// Create queue instances
const myQueue = new Queue('my-queue', { connection });
const sendEmailQueue = new Queue('send-email-queue', { connection });

async function testRailwayQueues() {
  console.log("=== Testing Railway Queue Services ===");
  console.log("Railway URL: queue-services-production.up.railway.app");
  
  try {
    // Test if we can connect to the remote Bull Board
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
      const myJob = await myQueue.add('railway-test-job', {
        data: "This is a Railway test job",
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ Added regular job to myQueue with ID: ${myJob.id}`);
    } catch (error) {
      console.error(`❌ Failed to add job to myQueue: ${error.message}`);
    }
    
    // Add a job to sendEmailQueue
    try {
      const emailJob = await sendEmailQueue.add('railway-test-email', {
        email: "test@example.com",
        subject: "Railway Test Email",
        text: "This is a test email sent from the Railway queue service.",
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
        'railway-scheduled-job',
        {
          data: "This is a scheduled Railway job",
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
        'railway-scheduled-email',
        {
          email: "test@example.com",
          subject: "Railway Scheduled Test Email",
          text: "This is a test email scheduled on Railway.",
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
        'railway-recurring-job',
        {
          data: "This is a recurring Railway job",
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
        'railway-recurring-email',
        {
          email: "test@example.com",
          subject: "Railway Recurring Test Email",
          text: "This is a recurring test email on Railway.",
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
    console.error("❌ Error testing Railway queues:", error);
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
testRailwayQueues().catch(console.error);
