/**
 * Combined Queue Services Endpoints Test Script
 * 
 * This script tests both SMS and Email capabilities through the Queue Services API.
 * It sends messages to the Queue Services endpoints for scheduling and delivery.
 * 
 * NOTE: This script is specifically for testing the QUEUE SERVICE, not direct backend
 * endpoints. The Queue Service will handle scheduling and callbacks to your backend.
 * 
 * Usage:
 * 1. Make sure Queue Services is running at the configured URL
 * 2. Set your test configuration in the script or using environment variables
 * 3. Run with: node test-all-endpoints.js
 */

import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration - CHANGE THESE VALUES
const API_URL = process.env.API_URL || 'https://cc.automate8.com';
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || 'https://secivres-eueuq.customerconnects.app';
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID || '15213'; // Updated with your actual workspace ID
const TEST_EMAIL = process.env.TEST_EMAIL || 'benjiemalinao87@gmail.com'; // Updated with your actual email
const TEST_PHONE = process.env.TEST_PHONE || '+16266635938'; // Updated with your actual phone number
const TEST_CONTACT_ID = process.env.TEST_CONTACT_ID || 'fc7b218e-ce7c-4317-8555-b62a91772598';

// Create readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to get user input
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Send a test email with configurable settings
 */
async function sendTestEmail(options = {}) {
  const {
    subject = `Test Email at ${new Date().toLocaleTimeString()}`,
    delay = 0,
    isQueueServiceFormat = true
  } = options;
  
  // Common email content
  const html = `
    <h1>Test Email from Queue Services</h1>
    <p>This is a test email sent from the Queue Services test script.</p>
    <p><strong>Type:</strong> ${delay > 0 ? 'Delayed' : 'Immediate'}</p>
    <p><strong>Delay:</strong> ${delay}ms (${delay/1000} seconds)</p>
    <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
    <p><strong>Expected delivery:</strong> ${new Date(Date.now() + delay).toISOString()}</p>
    <hr>
    <p>If you're seeing this, the email functionality is working correctly!</p>
  `;
  
  try {
    console.log(`\n📨 Sending ${delay > 0 ? 'delayed' : 'immediate'} test email to ${TEST_EMAIL}`);
    console.log(`Subject: ${subject}`);
    
    // Prepare payload based on format
    let payload;
    
    if (isQueueServiceFormat) {
      // This is the format that the Queue Service sends to the backend
      payload = {
        to: TEST_EMAIL,
        subject,
        html,
        contactId: TEST_CONTACT_ID, // Added contactId as a top-level field
        workspaceId: WORKSPACE_ID,
        delay: delay, // Always include delay, even if it's 0
        metadata: {
          source: 'queue_service',
          contactId: TEST_CONTACT_ID,
          campaignId: randomUUID(),
          messageId: randomUUID(),
          scheduledTime: new Date(Date.now() + delay).toISOString(),
          timestamp: new Date().toISOString(),
          callbackEndpoint: "/api/email/send" // Added callbackEndpoint to metadata
        }
      };
    } else {
      // This is the format used by direct API calls from the app
      payload = {
        to: TEST_EMAIL,
        subject,
        body: html, // Note: using 'body' instead of 'html' for direct format
        workspaceId: WORKSPACE_ID,
        contactId: TEST_CONTACT_ID
      };
    }
    
    console.log(`Using ${isQueueServiceFormat ? 'Queue Service' : 'Direct API'} format`);
    
    // Send the request
    let response;
    if (isQueueServiceFormat) {
      // Send to Queue Service for scheduling
      response = await fetch(`${QUEUE_SERVICE_URL}/api/schedule-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      // Send directly to backend API
      response = await fetch(`${API_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (delay > 0) {
        console.log(`⏰ Email scheduled for delivery in ${delay/1000} seconds`);
        console.log(`Expected delivery time: ${new Date(Date.now() + delay).toLocaleTimeString()}`);
      }
    } else {
      console.error('❌ Email sending failed!');
      console.error('Error:', JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a test SMS with configurable settings
 */
async function sendTestSMS(options = {}) {
  const {
    delay = 0,
    isQueueServiceFormat = true
  } = options;
  
  // Generate a timestamp for the message
  const timestamp = new Date().toISOString();
  const deliveryTime = new Date(Date.now() + delay).toISOString();
  
  // Common message content
  const message = `Test SMS from Queue Services script: ${timestamp}. Type: ${delay > 0 ? 'Delayed' : 'Immediate'}. Delay: ${delay/1000}s. Expected delivery: ${deliveryTime}`;
  
  try {
    console.log(`\n📱 Sending ${delay > 0 ? 'delayed' : 'immediate'} test SMS to ${TEST_PHONE}`);
    console.log(`Message: ${message.substring(0, 50)}...`);
    
    // Prepare payload based on format
    let payload;
    
    if (isQueueServiceFormat) {
      // This is the format that the Queue Service sends to the backend
      payload = {
        phoneNumber: TEST_PHONE,
        message,
        contactId: TEST_CONTACT_ID, // Added contactId as a top-level field
        workspaceId: WORKSPACE_ID,
        delay: delay, // Always include delay, even if it's 0
        metadata: {
          source: 'queue_service',
          contactId: TEST_CONTACT_ID,
          campaignId: randomUUID(),
          messageId: randomUUID(),
          scheduledTime: deliveryTime,
          timestamp,
          callbackEndpoint: "/send-sms" // Added callbackEndpoint to metadata
        }
      };
    } else {
      // This is the format used by direct API calls from the app
      payload = {
        to: TEST_PHONE,
        message,
        workspaceId: WORKSPACE_ID
      };
    }
    
    console.log(`Using ${isQueueServiceFormat ? 'Queue Service' : 'Direct API'} format`);
    
    // Send the request
    let response;
    if (isQueueServiceFormat) {
      // Send to Queue Service for scheduling
      response = await fetch(`${QUEUE_SERVICE_URL}/api/schedule-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      // Send directly to backend API
      response = await fetch(`${API_URL}/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SMS sent successfully!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (delay > 0) {
        console.log(`⏰ SMS scheduled for delivery in ${delay/1000} seconds`);
        console.log(`Expected delivery time: ${new Date(Date.now() + delay).toLocaleTimeString()}`);
      }
    } else {
      console.error('❌ SMS sending failed!');
      console.error('Error:', JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test queue service endpoints
 */
async function testQueueServiceEndpoints() {
  console.log(`
🧪 QUEUE SERVICES TEST SCRIPT
============================
Backend API: ${API_URL}
Queue Service: ${QUEUE_SERVICE_URL}
Workspace ID: ${WORKSPACE_ID}
Test Email: ${TEST_EMAIL}
Test Phone: ${TEST_PHONE}
============================
`);

  try {
    let running = true;
    
    while (running) {
      console.log('\n📋 TEST MENU');
      console.log('1. Test SMS - Immediate');
      console.log('2. Test SMS - Delayed');
      console.log('3. Test Email - Immediate');
      console.log('4. Test Email - Delayed');
      console.log('5. Run All Tests');
      console.log('0. Exit');
      
      const choice = await question('\nEnter your choice (0-5): ');
      
      switch (choice) {
        case '1':
          await sendTestSMS({
            delay: 0,
            isQueueServiceFormat: true
          });
          break;
          
        case '2':
          const smsDelayInput = await question('Enter delay in seconds: ');
          const smsDelay = parseInt(smsDelayInput) * 1000;
          await sendTestSMS({
            delay: smsDelay,
            isQueueServiceFormat: true
          });
          break;
          
        case '3':
          const emailSubject = await question('Enter email subject: ') || 'Test Immediate Email';
          await sendTestEmail({
            subject: emailSubject,
            delay: 0,
            isQueueServiceFormat: true
          });
          break;
          
        case '4':
          const emailDelayInput = await question('Enter delay in seconds: ');
          const emailDelay = parseInt(emailDelayInput) * 1000;
          const delayedSubject = await question('Enter email subject: ') || `Test Delayed Email (${emailDelayInput}s)`;
          await sendTestEmail({
            subject: delayedSubject,
            delay: emailDelay,
            isQueueServiceFormat: true
          });
          break;
          
        case '5':
          console.log('\n🚀 Running all tests...');
          
          // SMS tests
          await sendTestSMS({
            delay: 0,
            isQueueServiceFormat: true
          });
          
          await sendTestSMS({
            delay: 15000,
            isQueueServiceFormat: true
          });
          
          // Email tests
          await sendTestEmail({
            subject: '1. Immediate Email Test',
            delay: 0,
            isQueueServiceFormat: true
          });
          
          await sendTestEmail({
            subject: '2. Delayed Email Test (30s)',
            delay: 30000,
            isQueueServiceFormat: true
          });
          
          console.log('\n✅ All tests completed!');
          console.log('Check your inbox and phone for the test messages.');
          break;
          
        case '0':
          running = false;
          console.log('Exiting test script. Goodbye!');
          break;
          
        default:
          console.log('Invalid choice. Please try again.');
      }
    }
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    rl.close();
  }
}

// Run the tests
testQueueServiceEndpoints();
