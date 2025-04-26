// Test script for adding jobs to the AI response queue
require('dotenv').config();
const { addAIResponseJob } = require('./dist/queues/ai-response-queue');

async function testAIResponseQueue() {
  try {
    // Parameters that need to be provided
    const workspace_id = process.env.TEST_WORKSPACE_ID || '66338'; // Default test workspace ID
    const contact_id = process.env.TEST_CONTACT_ID || '5346834e-479f-4c5f-a53c-7bf97837fd68'; // Default test contact ID
    const message_id = `test-msg-${Date.now()}`; // Generate a unique message ID
    const message_text = 'This is a test AI response message';
    const callback_url = process.env.TEST_CALLBACK_URL || 'https://webhook.site/your-unique-id'; // You can use webhook.site for testing
    const rate_limit_key = `${workspace_id}:${contact_id}`; // Format specified in schema
    
    console.log('Adding job to AI Response Queue with parameters:');
    console.log({
      workspace_id,
      contact_id,
      message_id,
      message_text,
      callback_url,
      rate_limit_key
    });
    
    // Add job to queue
    const job = await addAIResponseJob({
      workspace_id,
      contact_id,
      message_id,
      message_text,
      callback_url,
      rate_limit_key
    });
    
    console.log('Job added successfully');
    console.log('Job ID:', job.id);
    console.log('Job Name:', job.name);
    
    // Close connections
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error adding job to queue:', error.message);
    process.exit(1);
  }
}

testAIResponseQueue(); 