/**
 * Metrics utility for monitoring batch processing performance
 * 
 * This module provides functions to track and report on batch processing metrics,
 * helping to monitor the effectiveness of rate limiting and batch processing.
 */

// Store metrics in memory
const metrics = {
  sms: {
    totalProcessed: 0,
    batchesProcessed: 0,
    successCount: 0,
    failureCount: 0,
    processingTimes: [] as number[],
    rateExceededCount: 0,
    lastProcessedTime: new Date(),
    // Track rate limit exceedances by workspace
    workspaceRateLimits: {} as Record<string, {
      count: number,
      lastExceeded: Date,
      details: Array<{
        timestamp: Date,
        batchSize: number,
        errorMessage: string
      }>
    }>
  },
  email: {
    totalProcessed: 0,
    batchesProcessed: 0,
    successCount: 0,
    failureCount: 0,
    processingTimes: [] as number[],
    rateExceededCount: 0,
    lastProcessedTime: new Date(),
    // Track rate limit exceedances by workspace
    workspaceRateLimits: {} as Record<string, {
      count: number,
      lastExceeded: Date,
      details: Array<{
        timestamp: Date,
        batchSize: number,
        errorMessage: string
      }>
    }>
  }
};

// Maximum number of processing times to store (to avoid memory issues)
const MAX_PROCESSING_TIMES = 1000;
// Maximum number of rate limit details to store per workspace
const MAX_RATE_LIMIT_DETAILS = 50;

/**
 * Record the start of a batch processing operation
 * @param type The type of message being processed ('sms' or 'email')
 * @returns A function to call when processing is complete
 */
export function startBatchProcessing(type: 'sms' | 'email') {
  const startTime = Date.now();
  
  return (batchSize: number, success: boolean, rateExceeded = false, workspaceId?: string, errorMessage?: string) => {
    const processingTime = Date.now() - startTime;
    const metricData = metrics[type];
    
    // Update metrics
    metricData.totalProcessed += batchSize;
    metricData.batchesProcessed += 1;
    metricData.lastProcessedTime = new Date();
    
    if (success) {
      metricData.successCount += batchSize;
    } else {
      metricData.failureCount += batchSize;
    }
    
    if (rateExceeded) {
      metricData.rateExceededCount += 1;
      
      // Track workspace-specific rate limit exceedances
      if (workspaceId) {
        if (!metricData.workspaceRateLimits[workspaceId]) {
          metricData.workspaceRateLimits[workspaceId] = {
            count: 0,
            lastExceeded: new Date(),
            details: []
          };
        }
        
        const workspaceMetrics = metricData.workspaceRateLimits[workspaceId];
        workspaceMetrics.count += 1;
        workspaceMetrics.lastExceeded = new Date();
        
        // Add details about this exceedance
        workspaceMetrics.details.push({
          timestamp: new Date(),
          batchSize,
          errorMessage: errorMessage || 'Rate limit exceeded'
        });
        
        // Trim details array if it gets too large
        if (workspaceMetrics.details.length > MAX_RATE_LIMIT_DETAILS) {
          workspaceMetrics.details = workspaceMetrics.details.slice(-MAX_RATE_LIMIT_DETAILS);
        }
      }
    }
    
    // Store processing time
    metricData.processingTimes.push(processingTime);
    
    // Trim processing times array if it gets too large
    if (metricData.processingTimes.length > MAX_PROCESSING_TIMES) {
      metricData.processingTimes = metricData.processingTimes.slice(-MAX_PROCESSING_TIMES);
    }
    
    return {
      batchSize,
      processingTime,
      success,
      rateExceeded,
      workspaceId
    };
  };
}

/**
 * Get current metrics for a specific message type
 * @param type The type of message ('sms' or 'email')
 */
export function getMetrics(type: 'sms' | 'email') {
  const metricData = metrics[type];
  
  // Calculate average processing time
  const avgProcessingTime = metricData.processingTimes.length > 0
    ? metricData.processingTimes.reduce((sum, time) => sum + time, 0) / metricData.processingTimes.length
    : 0;
  
  // Calculate throughput (messages per second)
  const throughput = metricData.totalProcessed > 0
    ? metricData.totalProcessed / (metricData.processingTimes.reduce((sum, time) => sum + time, 0) / 1000)
    : 0;
  
  // Get workspace rate limit data
  const workspaceRateLimits = Object.entries(metricData.workspaceRateLimits).map(([workspaceId, data]) => ({
    workspaceId,
    count: data.count,
    lastExceeded: data.lastExceeded,
    details: data.details
  })).sort((a, b) => b.count - a.count); // Sort by count in descending order
  
  return {
    totalProcessed: metricData.totalProcessed,
    batchesProcessed: metricData.batchesProcessed,
    successRate: metricData.totalProcessed > 0
      ? (metricData.successCount / metricData.totalProcessed) * 100
      : 0,
    avgProcessingTime,
    throughput,
    rateExceededCount: metricData.rateExceededCount,
    lastProcessedTime: metricData.lastProcessedTime,
    workspaceRateLimits
  };
}

/**
 * Get rate limit exceedance data for a specific workspace
 * @param type The type of message ('sms' or 'email')
 * @param workspaceId The workspace ID to get data for
 */
export function getWorkspaceRateLimitData(type: 'sms' | 'email', workspaceId: string) {
  const metricData = metrics[type];
  
  if (!metricData.workspaceRateLimits[workspaceId]) {
    return {
      workspaceId,
      count: 0,
      lastExceeded: null,
      details: []
    };
  }
  
  return {
    workspaceId,
    ...metricData.workspaceRateLimits[workspaceId]
  };
}

/**
 * Reset metrics for a specific message type
 * @param type The type of message ('sms' or 'email')
 * @param workspaceId Optional workspace ID to reset metrics for just that workspace
 */
export function resetMetrics(type: 'sms' | 'email', workspaceId?: string) {
  // If workspace ID is provided, only reset that workspace's rate limit data
  if (workspaceId && metrics[type].workspaceRateLimits[workspaceId]) {
    metrics[type].workspaceRateLimits[workspaceId] = {
      count: 0,
      lastExceeded: new Date(),
      details: []
    };
    return;
  }
  
  // Otherwise reset all metrics for this type
  metrics[type] = {
    totalProcessed: 0,
    batchesProcessed: 0,
    successCount: 0,
    failureCount: 0,
    processingTimes: [],
    rateExceededCount: 0,
    lastProcessedTime: new Date(),
    workspaceRateLimits: {}
  };
}

/**
 * Get a report of all metrics
 */
export function getMetricsReport() {
  return {
    sms: getMetrics('sms'),
    email: getMetrics('email'),
    timestamp: new Date(),
  };
}

export default {
  startBatchProcessing,
  getMetrics,
  getWorkspaceRateLimitData,
  resetMetrics,
  getMetricsReport,
};
