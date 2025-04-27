/**
 * AI Response API endpoints
 * 
 * This module provides HTTP endpoints for AI response processing
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { addAIResponseJob, getQueueMetrics } from '@/queues/ai-response-queue';
import { aiResponseSchema } from '@/queues/schemas/ai-response-schema';
import { z } from 'zod';
import { env } from '@/env';

// Default callback URL using the SMS_API_URL from environment variables
const DEFAULT_CALLBACK_URL = `${env.SMS_API_URL}/send-sms`;

const aiResponseRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/ai-response (legacy root endpoint)
   * Adds a new AI response job to the queue
   */
  fastify.post<{
    Body: z.infer<typeof aiResponseSchema>;
  }>('/', async (request, reply) => {
    try {
      // Ensure callback_url is set to default if not provided
      const jobData = {
        ...request.body,
        callback_url: request.body.callback_url || DEFAULT_CALLBACK_URL
      };
      
      const job = await addAIResponseJob(jobData);
      
      return {
        success: true,
        jobId: job.id,
        message: 'AI response job added to queue'
      };
    } catch (error: unknown) {
      fastify.log.error(error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      if (error instanceof Error && errorMessage.includes('Rate limit exceeded')) {
        return reply.code(429).send({
          success: false,
          error: errorMessage,
          message: 'Rate limit exceeded for AI responses'
        });
      }
      
      return reply.code(400).send({
        success: false,
        error: errorMessage,
        message: 'Failed to add AI response job to queue'
      });
    }
  });

  /**
   * POST /api/ai-response/enqueue
   * Added for compatibility with frontend client
   */
  fastify.post<{
    Body: z.infer<typeof aiResponseSchema>;
  }>('/enqueue', async (request, reply) => {
    try {
      // Ensure callback_url is set to default if not provided
      const jobData = {
        ...request.body,
        callback_url: request.body.callback_url || DEFAULT_CALLBACK_URL
      };
      
      const job = await addAIResponseJob(jobData);

      return {
        success: true,
        jobId: job.id,
        message: 'AI response job added to queue'
      };
    } catch (error: unknown) {
      fastify.log.error(error);

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      if (error instanceof Error && errorMessage.includes('Rate limit exceeded')) {
        return reply.code(429).send({
          success: false,
          error: errorMessage,
          message: 'Rate limit exceeded for AI responses'
        });
      }

      return reply.code(400).send({
        success: false,
        error: errorMessage,
        message: 'Failed to add AI response job to queue'
      });
    }
  });

  /**
   * POST /api/ai-response/callback
   * This endpoint is called by the AI response worker after processing
   * It's a placeholder for your backend to handle the processed AI response
   */
  fastify.post<{
    Body: {
      workspace_id: string;
      message_id: string;
      job_id: string;
    };
  }>('/callback', async (request, reply) => {
    const { workspace_id, message_id, job_id } = request.body;
    
    fastify.log.info(`Received AI response callback for message ${message_id} from job ${job_id}`);
    
    // This is where you would handle the processed AI response
    // For example, saving to database, sending notifications, etc.
    
    return {
      success: true,
      message: `AI response for message ${message_id} received and processed`
    };
  });

  /**
   * GET /api/ai-response/metrics
   * Returns queue metrics for monitoring
   */
  fastify.get('/metrics', async (_request, _reply) => {
    try {
      const metrics = await getQueueMetrics();
      return {
        success: true,
        metrics,
      };
    } catch (error: unknown) {
      fastify.log.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return _reply.code(500).send({
        success: false,
        error: errorMessage,
        message: 'Failed to fetch queue metrics',
      });
    }
  });
};

export default aiResponseRoutes; 