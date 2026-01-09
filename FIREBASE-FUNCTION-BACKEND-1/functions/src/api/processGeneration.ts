import { Request, Response } from 'express';
import { validateRequest } from '../utils/auth.js';
import { validateTopic } from '../utils/input-validation.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { sendToLLM } from '../services/chatgpt_ai.js';
import { saveFinalAnswer, saveGenerationMetadata } from '../services/firestoreService.js';
import { sendToBackend2 } from '../services/httpsservice.js';
import { PerformanceTimer } from '../utils/middleware.js';
import { recordValidationFailure, recordError, recordExternalApiCall } from '../utils/metrics.js';

/**
 * ASYNC BACKGROUND PROCESSING
 * This runs after the response is sent to the frontend
 */
const processGenerationAsync = async (
  userId: string,
  chatId: string,
  topic: string,
  traceId: string
) => {
  try {
    // ============ SAVE INITIAL STATE ============
    await saveGenerationMetadata(chatId, userId, {
      topic,
      status: 'processing'
    });

    logger.logInfo(
      { userId, chatId, operation: 'async_processing_started', traceId },
      'Background processing started'
    );

    // ============ GENERATE CODE ============
    logger.logInfo(
      { userId, chatId, operation: 'code_generation', traceId },
      'Starting code generation',
      { topicLength: topic.length }
    );
    
    const generationTimer = new PerformanceTimer('llm_generation', traceId);
    
    let generatedCode: string;
    try {
      generatedCode = await sendToLLM(topic);
      
      const generationDuration = generationTimer.end({ status: 'success' });
      
      recordExternalApiCall('openai', 'generate_code', 'success', generationDuration / 1000);
      
      logger.logExternalApiCall(
        'openai',
        'generate_code',
        { chatId, userId, operation: 'code_generation', traceId },
        'success',
        generationDuration,
        { 
          topicLength: topic.length,
          codeLength: generatedCode.length 
        }
      );
      
    } catch (llmError) {
      const generationDuration = generationTimer.end({ status: 'error' });
      
      recordExternalApiCall('openai', 'generate_code', 'error', generationDuration / 1000);
      
      logger.logError({
        error: llmError,
        context: { chatId, userId, operation: 'code_generation', traceId },
        message: 'Code generation failed'
      });
      
      await saveGenerationMetadata(chatId, userId, {
        topic,
        status: 'failed',
        error: llmError instanceof Error ? llmError.message : 'Unknown error'
      });
      
      // Don't throw - just log and return
      return;
    }

    // ============ SAVE GENERATED CODE ============
    logger.logInfo(
      { userId, chatId, operation: 'save_result', traceId },
      'Saving generated code'
    );
    
    await saveFinalAnswer(chatId, userId, generatedCode);
    await saveGenerationMetadata(chatId, userId, {
      topic,
      status: 'completed',
      generatedCode
    });

    // ============ NOTIFY BACKEND 2 ============
    logger.logInfo(
      { chatId, userId, operation: 'backend_2_request', traceId },
      'Code generation completed, sending HTTP request to Backend 2'
    );

    try {
      await sendToBackend2(userId, chatId, traceId);
      
      logger.logInfo(
        { chatId, userId, operation: 'backend_2_request', status: 'success', traceId },
        'HTTP request to Backend 2 successful'
      );

    } catch (httpError) {
      recordExternalApiCall('backend_2', 'post_generation_complete', 'error');
      
      logger.logError({
        error: httpError,
        context: { chatId, userId, operation: 'backend_2_request', traceId },
        message: 'Failed to send HTTP request to Backend 2, but generation completed successfully'
      });
    }

    logger.logInfo(
      { userId, chatId, operation: 'async_processing_complete', status: 'success', traceId },
      'Background processing completed successfully'
    );

  } catch (error) {
    // Catch any unexpected errors in async processing
    recordError(
      error instanceof Error ? error.name : 'UnknownError',
      'async_processing'
    );
    
    logger.logError({
      error,
      context: { 
        userId,
        chatId,
        operation: 'async_processing',
        status: 'error',
        traceId 
      },
      message: 'Async processing failed unexpectedly'
    });

    // Try to update Firestore with error state
    try {
      await saveGenerationMetadata(chatId, userId, {
        topic: 'Processing failed',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (saveError) {
      logger.logError({
        error: saveError,
        context: { userId, chatId, operation: 'save_error_state', traceId },
        message: 'Failed to save error state to Firestore'
      });
    }
  }
};

/**
 * HTTP ENDPOINT HANDLER - NOW WITH IMMEDIATE RESPONSE
 * Validates request, returns IDs immediately, then processes in background
 */
export const processWorkflow1 = async (req: Request, res: Response) => {
  const traceId = (req as any).traceId || logger.generateTraceId();
  const requestTimer = new PerformanceTimer('processGeneration_sync', traceId);
  
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
    const { topic } = req.body;
    
    if (!topic) {
      logger.logWarning(
        { userId, chatId, operation: 'validation', traceId },
        'Missing required field: topic'
      );
      res.status(400).json({ error: 'topic is required' });
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
        [],
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

    // ============ ✅ SEND IMMEDIATE RESPONSE TO FRONTEND ============
    const syncDuration = requestTimer.end({ status: 'success' });
    
    logger.logInfo(
      { userId, chatId, operation: 'request_accepted', status: 'success', traceId },
      `Request validated and accepted in ${syncDuration}ms, processing will continue in background`
    );

    res.json({
      success: true,
      userId,
      chatId,
      traceId,
      message: 'Request accepted, processing in background',
      metrics: {
        validationDurationMs: syncDuration,
      }
    });

    // ============ 🔥 START ASYNC PROCESSING (DON'T AWAIT) ============
    // This runs in the background after response is sent
    processGenerationAsync(userId, chatId, topic, traceId).catch(error => {
      // This catch is just for safety - errors are handled inside processGenerationAsync
      logger.logError({
        error,
        context: { userId, chatId, operation: 'async_processing_wrapper', traceId },
        message: 'Unhandled error in async processing wrapper'
      });
    });

    // Response already sent, function continues but doesn't block

  } catch (error) {
    const totalDuration = requestTimer.end({ status: 'error' });
    
    // Record error metric
    recordError(
      error instanceof Error ? error.name : 'UnknownError',
      'processGeneration_sync'
    );
    
    logger.logError({
      error,
      context: { 
        operation: 'http_request',
        status: 'error',
        traceId 
      },
      message: 'API request failed during validation phase',
      additionalData: {
        totalDurationMs: totalDuration,
      }
    });

    res.status(500).json({ 
      error: 'Internal server error',
      traceId
    });
  }
};