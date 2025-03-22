/**
 * Test script to add sample metrics data
 * 
 * This script adds sample rate limit exceedances for testing the dashboard
 */

import { startBatchProcessing } from '@/utils/metrics';

// Sample workspace IDs
const workspaceIds = ['workspace-1', 'workspace-2', 'workspace-3'];

// Add sample rate limit exceedances for SMS
function addSampleSmsRateLimits() {
  console.log('Adding sample SMS rate limit exceedances...');
  
  workspaceIds.forEach((workspaceId, index) => {
    // Create a batch metrics tracker
    const completeBatch = startBatchProcessing('sms');
    
    // Simulate a rate limit exceedance
    completeBatch({
      batchSize: 10 + index * 5,
      success: false,
      rateExceeded: true,
      workspaceId,
      error: new Error(`Rate limit exceeded for workspace ${workspaceId}`)
    });
    
    console.log(`Added rate limit exceedance for workspace ${workspaceId}`);
  });
}

// Add sample rate limit exceedances for Email
function addSampleEmailRateLimits() {
  console.log('Adding sample Email rate limit exceedances...');
  
  workspaceIds.forEach((workspaceId, index) => {
    // Create a batch metrics tracker
    const completeBatch = startBatchProcessing('email');
    
    // Simulate a rate limit exceedance
    completeBatch({
      batchSize: 15 + index * 10,
      success: false,
      rateExceeded: true,
      workspaceId,
      error: new Error(`Rate limit exceeded for workspace ${workspaceId}`)
    });
    
    console.log(`Added rate limit exceedance for workspace ${workspaceId}`);
  });
}

// Run the test
addSampleSmsRateLimits();
addSampleEmailRateLimits();

console.log('Sample metrics data added successfully!');
