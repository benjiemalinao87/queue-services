/**
 * Direct test script for the AI response queue
 * Uses the API endpoint to add a job to the queue
 */

import fetch from 'node-fetch';

// API URL - Using production endpoint
const API_URL = process.env.API_URL || 'https://secivres-eueuq.customerconnects.app';
const AI_RESPONSE_ENDPOINT = '/api/ai-response';

// For callback testing - using actual SMS endpoint
const SMS_BACKEND_URL = 'https://cc.automate8.com';
const SMS_ENDPOINT = '/send-sms';

// Test data provided by the user
const testData = {
  workspace_id: '15213',
  contact_id: 'fc7b218e-ce7c-4317-8555-b62a91772598',
  message_id: `test-msg-${Date.now()}`,
  message_text: 'what is your services?',
  // Using SMS endpoint as callback since it exists and is properly implemented
  callback_url: `${SMS_BACKEND_URL}${SMS_ENDPOINT}`,
  rate_limit_key: '15213:fc7b218e-ce7c-4317-8555-b62a91772598'
};

async function testAIResponseAPI() {
  console.log('=== Starting Direct AI Response API Test ===');
  console.log('Current time:', new Date().toISOString());
  console.log('API Endpoint:', `${API_URL}${AI_RESPONSE_ENDPOINT}`);
  console.log('Callback URL:', testData.callback_url);
  console.log('Test data:', testData);
  
  try {
    console.log(`Sending request to ${API_URL}${AI_RESPONSE_ENDPOINT}`);
    
    const response = await fetch(`${API_URL}${AI_RESPONSE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('API Response:', result);
    console.log('=== AI Response API Test Completed Successfully ===');
    console.log('Check the Bull Dashboard to see the job in the queue');
    console.log('Note: The job may still fail if the callback endpoint is not set up to handle AI response data');
    console.log('To view worker logs, run: pnpm pm2 logs');
  } catch (error) {
    console.error('Error during API test:', error);
  }
}

testAIResponseAPI(); 