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

async function testRemoteQueues() {
  try {
    // Test if we can connect to the remote Bull Board
    console.log("Testing connection to Bull Board UI...");
    try {
      await axios.get('https://queue-services-production.up.railway.app/ui', {
        auth: {
          username: 'admin',
          password: 'admin123'
        }
      });
      console.log("✅ Successfully connected to Bull Board UI");
    } catch (error) {
      console.error("❌ Failed to connect to Bull Board UI:", error.message);
    }

    // Add a regular job to myQueue
    console.log("Adding regular job to myQueue...");
    const myJob = await myQueue.add('remote-test-job', {
      data: "This is a remote test job",
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ Added regular job to myQueue with ID: ${myJob.id}`);

    // Add a scheduled job to myQueue
    console.log("Adding scheduled job to myQueue...");
    const scheduledMyJob = await myQueue.add(
      'remote-scheduled-job',
      {
        data: "This is a remote scheduled job",
        timestamp: new Date().toISOString(),
      },
      {
        delay: 30000, // 30 seconds
      }
    );
    console.log(`✅ Added scheduled job to myQueue with ID: ${scheduledMyJob.id}, will run in 30 seconds`);

    // Add a recurring job to myQueue
    console.log("Adding recurring job to myQueue...");
    const recurringMyJob = await myQueue.add(
      'remote-recurring-job',
      {
        data: "This is a remote recurring job",
        timestamp: new Date().toISOString(),
      },
      {
        repeat: {
          every: 120000, // 2 minutes
        },
      }
    );
    console.log(`✅ Added recurring job to myQueue with ID: ${recurringMyJob.id}, will run every 2 minutes`);

    // Add a regular job to sendEmailQueue
    console.log("Adding regular job to sendEmailQueue...");
    const emailJob = await sendEmailQueue.add('remote-test-email', {
      email: "test@example.com",
      subject: "Remote Test Email",
      text: "This is a test email sent as a remote job.",
    });
    console.log(`✅ Added regular job to sendEmailQueue with ID: ${emailJob.id}`);

    // Add a scheduled job to sendEmailQueue
    console.log("Adding scheduled job to sendEmailQueue...");
    const scheduledEmailJob = await sendEmailQueue.add(
      'remote-scheduled-email',
      {
        email: "test@example.com",
        subject: "Remote Scheduled Test Email",
        text: "This is a test email sent as a remote scheduled job.",
      },
      {
        delay: 60000, // 1 minute
      }
    );
    console.log(`✅ Added scheduled job to sendEmailQueue with ID: ${scheduledEmailJob.id}, will run in 1 minute`);

    // Add a recurring job to sendEmailQueue
    console.log("Adding recurring job to sendEmailQueue...");
    const recurringEmailJob = await sendEmailQueue.add(
      'remote-recurring-email',
      {
        email: "test@example.com",
        subject: "Remote Recurring Test Email",
        text: "This is a test email sent as a remote recurring job.",
      },
      {
        repeat: {
          every: 180000, // 3 minutes
        },
      }
    );
    console.log(`✅ Added recurring job to sendEmailQueue with ID: ${recurringEmailJob.id}, will run every 3 minutes`);

    console.log("\n✅ All test jobs have been added successfully!");
    console.log("You can check the Bull Board UI to see the jobs in the queues:");
    console.log("URL: https://queue-services-production.up.railway.app/ui");
    console.log("Username: admin");
    console.log("Password: admin123");

  } catch (error) {
    console.error("❌ Error testing remote queues:", error);
  } finally {
    // Close the connections
    await myQueue.close();
    await sendEmailQueue.close();
    console.log("Queue connections closed");
  }
}

testRemoteQueues().catch(console.error);
