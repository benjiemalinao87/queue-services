import { myQueue } from "@/queues/my-queue";
import { sendEmailQueue } from "@/queues/email-queue";

async function testRegularJobs() {
  console.log("Adding regular jobs to queues...");
  
  // Add a job to myQueue
  const myJob = await myQueue.add("regular-job", {
    data: "This is a regular job for myQueue",
    timestamp: new Date().toISOString(),
  });
  console.log(`Added regular job to myQueue with ID: ${myJob.id}`);
  
  // Add a job to sendEmailQueue
  const emailJob = await sendEmailQueue.add("regular-email", {
    email: "test@example.com",
    subject: "Test Regular Email",
    text: "This is a test email sent as a regular job.",
  });
  console.log(`Added regular job to sendEmailQueue with ID: ${emailJob.id}`);
}

async function testScheduledJobs() {
  console.log("Adding scheduled jobs to queues...");
  
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
  console.log(`Added scheduled job to myQueue with ID: ${scheduledMyJob.id}, will run in 30 seconds`);
  
  // Schedule a job for sendEmailQueue to run in 1 minute
  const scheduledEmailJob = await sendEmailQueue.add(
    "scheduled-email",
    {
      email: "test@example.com",
      subject: "Test Scheduled Email",
      text: "This is a test email sent as a scheduled job.",
    },
    {
      delay: 60000, // 1 minute
    }
  );
  console.log(`Added scheduled job to sendEmailQueue with ID: ${scheduledEmailJob.id}, will run in 1 minute`);
}

async function testRecurringJobs() {
  console.log("Adding recurring jobs to queues...");
  
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
  console.log(`Added recurring job to myQueue with ID: ${recurringMyJob.id}, will run every 2 minutes`);
  
  // Add a recurring job to sendEmailQueue (every 3 minutes)
  const recurringEmailJob = await sendEmailQueue.add(
    "recurring-email",
    {
      email: "test@example.com",
      subject: "Test Recurring Email",
      text: "This is a test email sent as a recurring job.",
    },
    {
      repeat: {
        every: 180000, // 3 minutes
      },
    }
  );
  console.log(`Added recurring job to sendEmailQueue with ID: ${recurringEmailJob.id}, will run every 3 minutes`);
}

async function main() {
  try {
    await testRegularJobs();
    await testScheduledJobs();
    await testRecurringJobs();
    
    console.log("All test jobs have been added successfully!");
    console.log("You can check the Bull Board UI to see the jobs in the queues.");
    console.log("Regular jobs should be processed immediately.");
    console.log("Scheduled jobs will be processed after their delay time.");
    console.log("Recurring jobs will be processed at their specified intervals.");
    
    // Keep the process alive for a while to allow some jobs to be processed
    console.log("Waiting for 2 minutes to allow some jobs to be processed...");
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
    
    console.log("Test completed. Exiting...");
    process.exit(0);
  } catch (error) {
    console.error("Error adding test jobs:", error);
    process.exit(1);
  }
}

main().catch(console.error);
