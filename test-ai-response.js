// Test script for adding jobs to the AI response queue
require('dotenv').config();
const { addAIResponseJob } = require('./dist/queues/ai-response-queue');

async function testAIResponseQueue() {
  try {
    // Parameters provided by the user
    const workspace_id = '15213'; // User-provided workspace ID
    const contact_id = 'fc7b218e-ce7c-4317-8555-b62a91772598'; // User-provided contact ID
    const message_id = `test-msg-${Date.now()}`; // Generate a unique message ID
    const message_text = 'what is your services?'; // User-provided message text
    
    // In the AI response flow:
    // 1. The callback_url is the endpoint in your backend API that will receive
    //    the processed AI response (similar to how the SMS worker calls the SMS API)
    // 2. This callback endpoint should be an actual endpoint in your application
    //    that can handle the AI response
    const callback_url = process.env.APP_API_URL || 'https://cc.automate8.com/api/ai-response/callback';
    
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