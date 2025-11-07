import { Request, Response } from 'express';
import { validateRequest } from '../utils/auth.js';
import { validateTopic } from '../utils/input-validation.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { WorkflowService } from '../services/workflowService.js';

/**
 * HTTP endpoint handler for Workflow 1
 */
export const processWorkflow1 = async (req: Request, res: Response) => {
  try {
    // Auth check
    const authResult = validateRequest(req);
    if (authResult.error) {
      res.status(403).json({ error: authResult.error });
      return;
    }

    const { userId, chatId } = authResult as { userId: string; chatId: string };

    // Basic request validation
    const { topic, followUpAnswers } = req.body;
    
    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }
    
    if (!followUpAnswers || !Array.isArray(followUpAnswers)) {
      res.status(400).json({ error: 'followUpAnswers is required' });
      return;
    }

    // Validate topic
    const validation = await validateTopic(topic);
    if (!validation.valid) {
      res.status(400).json({ error: 'Invalid topic', details: validation.reasons });
      return;
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    // Process workflow
    const workflowService = new WorkflowService(userId);
    const { } = await workflowService.processWorkflow1(chatId, followUpAnswers);

    // Success response
    res.json({
      success: true,
      userId,
      chatId
    });

  } catch (error) {
    logger.logError({
      error,
      context: { operation: 'http_request' },
      message: 'API request failed'
    });

    res.status(500).json({ error: 'Internal server error' });
  }
};