import { Request, Response } from 'express';
import { validateRequest } from '../utils/auth.js';
import { validateTopic } from '../utils/input-validation.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { WorkflowService } from '../services/workflowService.js';
import { PerformanceTimer } from '../utils/middleware.js';
import { recordValidationFailure, recordError } from '../utils/metrics.js';

/**
 * HTTP endpoint handler for Workflow 1
 */
export const processWorkflow1 = async (req: Request, res: Response) => {
  const traceId = (req as any).traceId || logger.generateTraceId();
  const requestTimer = new PerformanceTimer('processWorkflow1', traceId);
  
  try {
    // ============ AUTH CHECK ============
    const authTimer = new PerformanceTimer('auth_validation', traceId);
    const authResult = validateRequest(req);
    authTimer.end();
    
    if (authResult.error) {
      logger.logAuthEvent(null, 'invalid_origin', {
        traceId,
        origin: req.headers.origin,
      });
      
      res.status(403).json({ error: authResult.error });
      return;
    }

    const { userId, chatId } = authResult as { userId: string; chatId: string };
    
    // Store userId in request for middleware
    (req as any).userId = userId;
    
    logger.logAuthEvent(userId, 'success', {
      traceId,
      chatId,
    });

    // ============ REQUEST VALIDATION ============
    const { topic, followUpAnswers } = req.body;
    
    if (!topic) {
      logger.logWarning(
        { userId, chatId, operation: 'validation', traceId },
        'Missing required field: topic'
      );
      res.status(400).json({ error: 'topic is required' });
      return;
    }
    
    if (!followUpAnswers || !Array.isArray(followUpAnswers)) {
      logger.logWarning(
        { userId, chatId, operation: 'validation', traceId },
        'Missing or invalid field: followUpAnswers'
      );
      res.status(400).json({ error: 'followUpAnswers is required' });
      return;
    }

    // ============ TOPIC VALIDATION ============
    const validationTimer = new PerformanceTimer('topic_validation', traceId);
    const validation = await validateTopic(topic);
    validationTimer.end({ valid: validation.valid });
    
    if (!validation.valid) {
      // Record each failed check as a metric
      validation.reasons.forEach(reason => {
        const checkType = reason.toLowerCase().includes('profanity') ? 'profanity' :
                         reason.toLowerCase().includes('injection') ? 'injection' :
                         reason.toLowerCase().includes('url') ? 'url' :
                         reason.toLowerCase().includes('english') ? 'language' :
                         'other';
        recordValidationFailure('topic', checkType);
      });
      
      logger.logValidationFailure(
        { userId, chatId, operation: 'validation', traceId },
        'topic',
        validation.failedChecks || [],
        validation.reasons
      );
      
      res.status(400).json({ error: 'Invalid topic', details: validation.reasons });
      return;
    }

    // ============ RATE LIMIT CHECK ============
    const rateLimitTimer = new PerformanceTimer('rate_limit_check', traceId);
    const rateLimit = await checkRateLimit(userId);
    rateLimitTimer.end({ allowed: rateLimit.allowed });
    
    if (!rateLimit.allowed) {
      logger.logWarning(
        { userId, chatId, operation: 'rate_limit', status: 'error', traceId },
        'Rate limit exceeded',
        { reason: rateLimit.reason }
      );
      
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        reason: rateLimit.reason 
      });
      return;
    }

    // ============ PROCESS WORKFLOW ============
    logger.logInfo(
      { userId, chatId, operation: 'workflow_start', traceId },
      'Starting workflow processing',
      { 
        topicLength: topic.length,
        answersCount: followUpAnswers.length 
      }
    );
    
    const workflowTimer = new PerformanceTimer('workflow_execution', traceId);
    const workflowService = new WorkflowService(userId, traceId);
    
    await workflowService.processWorkflow1(chatId, followUpAnswers);
    
    const workflowDuration = workflowTimer.end({ status: 'success' });
    
    logger.logInfo(
      { userId, chatId, operation: 'workflow_complete', status: 'success', traceId },
      `Workflow completed successfully in ${workflowDuration}ms`,
      { 
        totalDurationMs: workflowDuration 
      }
    );

    // ============ SUCCESS RESPONSE ============
    const totalDuration = requestTimer.end({ status: 'success' });
    
    res.json({
      success: true,
      userId,
      chatId,
      traceId,
      metrics: {
        totalDurationMs: totalDuration,
        workflowDurationMs: workflowDuration,
      }
    });

  } catch (error) {
    const totalDuration = requestTimer.end({ status: 'error' });
    
    // Record error metric
    recordError(
      error instanceof Error ? error.name : 'UnknownError',
      'processWorkflow1'
    );
    
    logger.logError({
      error,
      context: { 
        operation: 'http_request',
        status: 'error',
        traceId 
      },
      message: 'API request failed',
      additionalData: {
        totalDurationMs: totalDuration,
      }
    });

    res.status(500).json({ 
      error: 'Internal server error',
      traceId // Include trace ID for debugging
    });
  }
};