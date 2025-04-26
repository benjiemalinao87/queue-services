/**
 * AI Response API endpoints
 * 
 * This module provides HTTP endpoints for AI response processing
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { addAIResponseJob } from '@/queues/ai-response-queue';
import { aiResponseSchema } from '@/queues/schemas/ai-response-schema';
import { z } from 'zod';

const aiResponseRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/ai-response
   * Adds a new AI response job to the queue
   */
  fastify.post<{
    Body: z.infer<typeof aiResponseSchema>;
  }>('/', async (request, reply) => {
    try {
      const job = await addAIResponseJob(request.body);
      
      return {
        success: true,
        jobId: job.id,
        message: 'AI response job added to queue'
      };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.message?.includes('Rate limit exceeded')) {
        return reply.code(429).send({
          success: false,
          error: error.message,
          message: 'Rate limit exceeded for AI responses'
        });
      }
      
      return reply.code(400).send({
        success: false,
        error: error.message,
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
};

export default aiResponseRoutes; 