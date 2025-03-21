import axios from 'axios';

// Bull Board UI URL
const BULL_BOARD_URL = 'https://queue-services-production.up.railway.app/ui';
const BULL_BOARD_USERNAME = 'admin';
const BULL_BOARD_PASSWORD = 'admin123';

// Function to test connection to Bull Board UI
async function testBullBoardUI() {
  console.log("\n=== Testing Bull Board UI Connection ===");
  try {
    const response = await axios.get(BULL_BOARD_URL, {
      auth: {
        username: BULL_BOARD_USERNAME,
        password: BULL_BOARD_PASSWORD
      }
    });
    console.log(`✅ Successfully connected to Bull Board UI (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Bull Board UI: ${error.message}`);
    return false;
  }
}

// Function to get queues from Bull Board API
async function getQueues() {
  console.log("\n=== Getting Queues from Bull Board API ===");
  try {
    const response = await axios.get(`${BULL_BOARD_URL}/api/queues`, {
      auth: {
        username: BULL_BOARD_USERNAME,
        password: BULL_BOARD_PASSWORD
      }
    });
    
    console.log(`✅ Successfully retrieved queues from Bull Board API`);
    console.log("Queues:", JSON.stringify(response.data, null, 2));
    return response.data.queues;
  } catch (error) {
    console.error(`❌ Failed to get queues from Bull Board API: ${error.message}`);
    return null;
  }
}

// Function to get jobs from a specific queue
async function getJobs(queueName: string) {
  console.log(`\n=== Getting Jobs from Queue: ${queueName} ===`);
  try {
    const response = await axios.get(`${BULL_BOARD_URL}/api/queues/${queueName}/jobs`, {
      auth: {
        username: BULL_BOARD_USERNAME,
        password: BULL_BOARD_PASSWORD
      }
    });
    
    console.log(`✅ Successfully retrieved jobs from queue: ${queueName}`);
    console.log("Jobs:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to get jobs from queue ${queueName}: ${error.message}`);
    return null;
  }
}

// Function to add a test job to my-queue
async function addTestJob() {
  console.log("\n=== Adding Test Job to my-queue ===");
  try {
    const response = await axios.post(
      `${BULL_BOARD_URL}/api/queues/my-queue/jobs`,
      {
        name: "test-job",
        data: {
          data: "This is a test job added via Bull Board API",
          timestamp: new Date().toISOString()
        },
        opts: {}
      },
      {
        auth: {
          username: BULL_BOARD_USERNAME,
          password: BULL_BOARD_PASSWORD
        }
      }
    );
    
    console.log(`✅ Successfully added test job to my-queue`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to add test job to my-queue: ${error.message}`);
    return null;
  }
}

// Function to add a test email job to send-email-queue
async function addTestEmailJob() {
  console.log("\n=== Adding Test Email Job to send-email-queue ===");
  try {
    const response = await axios.post(
      `${BULL_BOARD_URL}/api/queues/send-email-queue/jobs`,
      {
        name: "test-email",
        data: {
          email: "test@example.com",
          subject: "Test Email via Bull Board API",
          text: "This is a test email sent via Bull Board API."
        },
        opts: {}
      },
      {
        auth: {
          username: BULL_BOARD_USERNAME,
          password: BULL_BOARD_PASSWORD
        }
      }
    );
    
    console.log(`✅ Successfully added test email job to send-email-queue`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to add test email job to send-email-queue: ${error.message}`);
    return null;
  }
}

// Function to add a scheduled test job to my-queue
async function addScheduledTestJob() {
  console.log("\n=== Adding Scheduled Test Job to my-queue ===");
  try {
    const response = await axios.post(
      `${BULL_BOARD_URL}/api/queues/my-queue/jobs`,
      {
        name: "scheduled-test-job",
        data: {
          data: "This is a scheduled test job added via Bull Board API",
          timestamp: new Date().toISOString()
        },
        opts: {
          delay: 60000 // 1 minute delay
        }
      },
      {
        auth: {
          username: BULL_BOARD_USERNAME,
          password: BULL_BOARD_PASSWORD
        }
      }
    );
    
    console.log(`✅ Successfully added scheduled test job to my-queue`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to add scheduled test job to my-queue: ${error.message}`);
    return null;
  }
}

// Function to add a scheduled test email job to send-email-queue
async function addScheduledTestEmailJob() {
  console.log("\n=== Adding Scheduled Test Email Job to send-email-queue ===");
  try {
    const response = await axios.post(
      `${BULL_BOARD_URL}/api/queues/send-email-queue/jobs`,
      {
        name: "scheduled-test-email",
        data: {
          email: "test@example.com",
          subject: "Scheduled Test Email via Bull Board API",
          text: "This is a scheduled test email sent via Bull Board API."
        },
        opts: {
          delay: 120000 // 2 minutes delay
        }
      },
      {
        auth: {
          username: BULL_BOARD_USERNAME,
          password: BULL_BOARD_PASSWORD
        }
      }
    );
    
    console.log(`✅ Successfully added scheduled test email job to send-email-queue`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to add scheduled test email job to send-email-queue: ${error.message}`);
    return null;
  }
}

// Main function to run all tests
async function runTests() {
  console.log("=== Starting Bull Board Tests ===");
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Test Bull Board UI connection
  const uiConnected = await testBullBoardUI();
  
  if (uiConnected) {
    // Get queues
    const queues = await getQueues();
    
    if (queues && queues.length > 0) {
      // For each queue, get jobs
      for (const queue of queues) {
        await getJobs(queue.name);
      }
      
      // Add regular jobs
      await addTestJob();
      await addTestEmailJob();
      
      // Add scheduled jobs
      await addScheduledTestJob();
      await addScheduledTestEmailJob();
      
      // Check jobs again after adding new ones
      console.log("\n=== Checking Jobs After Adding New Ones ===");
      for (const queue of queues) {
        await getJobs(queue.name);
      }
      
      console.log("\n=== Job Testing Summary ===");
      console.log("✅ Regular jobs should be processed immediately");
      console.log("✅ Scheduled jobs will be processed after their delay time:");
      console.log("  - Scheduled test job: Will run in 1 minute");
      console.log("  - Scheduled test email job: Will run in 2 minutes");
      console.log("\nYou can check the Bull Board UI to monitor job status:");
      console.log(`URL: ${BULL_BOARD_URL}`);
      console.log(`Username: ${BULL_BOARD_USERNAME}`);
      console.log(`Password: ${BULL_BOARD_PASSWORD}`);
    }
  }
  
  console.log("\n=== Bull Board Tests Completed ===");
}

// Run all tests
runTests().catch(error => {
  console.error("Unhandled error during tests:", error);
});
