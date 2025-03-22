/**
 * Metrics API endpoint
 * 
 * This module provides HTTP endpoints for viewing batch processing metrics
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getMetricsReport, resetMetrics, getWorkspaceRateLimitData } from '@/utils/metrics';

const metricsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /metrics
   * Returns current metrics for SMS and Email batch processing
   */
  fastify.get('/', async (request, reply) => {
    const metrics = getMetricsReport();
    return metrics;
  });

  /**
   * GET /metrics/workspace/:workspaceId
   * Returns rate limit metrics for a specific workspace
   */
  fastify.get<{ Params: { workspaceId: string } }>('/workspace/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params;
    
    if (!workspaceId) {
      return reply.code(400).send({ error: 'Workspace ID is required' });
    }
    
    const smsData = getWorkspaceRateLimitData('sms', workspaceId);
    const emailData = getWorkspaceRateLimitData('email', workspaceId);
    
    return {
      workspaceId,
      sms: smsData,
      email: emailData,
      timestamp: new Date()
    };
  });

  /**
   * POST /metrics/reset
   * Resets metrics for a specific type or all types
   */
  fastify.post<{ Body: { type?: string; workspaceId?: string } }>('/reset', async (request, reply) => {
    const { type, workspaceId } = request.body || {};
    
    if (workspaceId) {
      // Reset metrics for a specific workspace
      if (type === 'sms') {
        resetMetrics('sms', workspaceId);
        return { success: true, message: `SMS metrics for workspace ${workspaceId} reset successfully` };
      } else if (type === 'email') {
        resetMetrics('email', workspaceId);
        return { success: true, message: `Email metrics for workspace ${workspaceId} reset successfully` };
      } else {
        // Reset both for this workspace
        resetMetrics('sms', workspaceId);
        resetMetrics('email', workspaceId);
        return { success: true, message: `All metrics for workspace ${workspaceId} reset successfully` };
      }
    } else {
      // Reset all metrics for a type
      if (type === 'sms') {
        resetMetrics('sms');
        return { success: true, message: 'SMS metrics reset successfully' };
      } else if (type === 'email') {
        resetMetrics('email');
        return { success: true, message: 'Email metrics reset successfully' };
      } else {
        // Reset both
        resetMetrics('sms');
        resetMetrics('email');
        return { success: true, message: 'All metrics reset successfully' };
      }
    }
  });
};

export default metricsRoutes;
