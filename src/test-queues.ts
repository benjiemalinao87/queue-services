import { myQueue } from "@/queues/my-queue";
import { sendEmailQueue } from "@/queues/email-queue";
import { env } from "@/env";

async function testQueues() {
  console.log("=== Queue Services Test ===");
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Redis Host: ${env.REDIS_HOST}`);
  console.log(`Redis Port: ${env.REDIS_PORT}`);
  
  try {
    // Test regular jobs
    console.log("\n--- Testing Regular Jobs ---");
    
    // Add a job to myQueue
    const myJob = await myQueue.add("test-job", {
      data: "This is a test job for myQueue",
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ Added regular job to myQueue with ID: ${myJob.id}`);
    
    // Add a job to sendEmailQueue
    const emailJob = await sendEmailQueue.add("test-email", {
      email: "test@example.com",
      subject: "Test Email",
      text: "This is a test email sent from the queue service.",
    });
    console.log(`✅ Added regular job to sendEmailQueue with ID: ${emailJob.id}`);
    
    // Test scheduled jobs
    console.log("\n--- Testing Scheduled Jobs ---");
    
    // Schedule a job for myQueue to run in 30 seconds
    const scheduledMyJob = await myQueue.add(
      "scheduled-job",
      {
        data: "This is a scheduled job for myQueue",
        timestamp: new Date().toISOString(),
      },
      {
        delay: 30000, // 30 seconds
      }
    );
    console.log(`✅ Added scheduled job to myQueue with ID: ${scheduledMyJob.id}, will run in 30 seconds`);
    
    // Schedule a job for sendEmailQueue to run in 1 minute
    const scheduledEmailJob = await sendEmailQueue.add(
      "scheduled-email",
      {
        email: "test@example.com",
        subject: "Scheduled Test Email",
        text: "This is a test email scheduled to be sent after a delay.",
      },
      {
        delay: 60000, // 1 minute
      }
    );
    console.log(`✅ Added scheduled job to sendEmailQueue with ID: ${scheduledEmailJob.id}, will run in 1 minute`);
    
    // Test recurring jobs
    console.log("\n--- Testing Recurring Jobs ---");
    
    // Add a recurring job to myQueue (every 2 minutes)
    const recurringMyJob = await myQueue.add(
      "recurring-job",
      {
        data: "This is a recurring job for myQueue",
        timestamp: new Date().toISOString(),
      },
      {
        repeat: {
          every: 120000, // 2 minutes
        },
      }
    );
    console.log(`✅ Added recurring job to myQueue with ID: ${recurringMyJob.id}, will run every 2 minutes`);
    
    // Add a recurring job to sendEmailQueue (every 3 minutes)
    const recurringEmailJob = await sendEmailQueue.add(
      "recurring-email",
      {
        email: "test@example.com",
        subject: "Recurring Test Email",
        text: "This is a test email that will be sent repeatedly.",
      },
      {
        repeat: {
          every: 180000, // 3 minutes
        },
      }
    );
    console.log(`✅ Added recurring job to sendEmailQueue with ID: ${recurringEmailJob.id}, will run every 3 minutes`);
    
    console.log("\n✅ All test jobs have been added successfully!");
    console.log("You can check the Bull Board UI to see the jobs in the queues.");
    console.log("Regular jobs should be processed immediately.");
    console.log("Scheduled jobs will be processed after their delay time.");
    console.log("Recurring jobs will be processed at their specified intervals.");
    
    // Keep the process alive for a while to allow some jobs to be processed
    console.log("\nWaiting for 30 seconds to allow some jobs to be processed...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    // Close the connections
    await myQueue.close();
    await sendEmailQueue.close();
    console.log("Queue connections closed");
    
    console.log("\nTest completed. Exiting...");
  } catch (error) {
    console.error("❌ Error testing queues:", error);
  }
}

// Run the test
testQueues().catch(console.error);
