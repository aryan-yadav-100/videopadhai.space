/**
 * HTTP Middleware for automatic monitoring and logging
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
<<<<<<< HEAD
import { recordHttpRequest, pushMetricsToGateway } from './metrics.js';
=======
import { recordHttpRequest } from './metrics.js';
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)

/**
 * Monitoring middleware - tracks all HTTP requests
 * Add this to your Firebase Functions HTTP handler
 */
export const monitoringMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Generate trace ID for this request
  const traceId = logger.generateTraceId();
  
  // Store trace ID in request object for use in handlers
  (req as any).traceId = traceId;
  
  // Record start time
  const startTime = Date.now();
  
  // Log incoming request
  logger.logInfo(
    {
      operation: 'http_request',
      status: 'processing',
      traceId,
    },
    `Incoming ${req.method} ${req.path}`,
    {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    }
  );

  // Capture the original res.json and res.status methods
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  
  let statusCode = 200;
  let responseBody: any;

  // Override res.status to capture status code
  res.status = function (code: number) {
    statusCode = code;
    return originalStatus(code);
  };

  // Override res.json to capture response and log metrics
  res.json = function (body: any) {
    responseBody = body;
    
    // Calculate duration
    const durationMs = Date.now() - startTime;
    const durationSeconds = durationMs / 1000;
    
    // Extract userId from response if available
    const userId = body?.userId || (req as any).userId;
    
    // Record metrics
    recordHttpRequest(
      req.method,
      req.path,
      statusCode,
      durationSeconds
    );
    
    // Log request completion
    logger.logHttpRequest(
      req.method,
      req.path,
      statusCode,
      userId,
      durationMs,
      traceId,
      {
        hasError: statusCode >= 400,
        errorType: statusCode >= 400 ? body?.error : undefined,
      }
    );
    
<<<<<<< HEAD
    // Push metrics to gateway (fire and forget)
    pushMetricsToGateway().catch(err => {
      // Silently fail - don't impact the response
      logger.logDebug(
        { operation: 'metrics_push', traceId },
        'Metrics push failed',
        { error: err.message }
      );
    });
    
=======
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
    // Send the actual response
    return originalJson(body);
  };

  // Continue to next handler
  next();
};

/**
 * Error handling middleware - catches all errors
 */
export const errorHandlingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const traceId = (req as any).traceId || 'unknown';
  
  logger.logError({
    error: err,
    context: {
      operation: 'http_request',
      status: 'error',
      traceId,
    },
    message: 'Unhandled error in HTTP handler',
    additionalData: {
      method: req.method,
      path: req.path,
      body: req.body,
    },
  });

  // Record error metric
  const { recordError } = require('./metrics.js');
  recordError(err.name || 'UnknownError', 'http_request');

  // Send error response
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      traceId, // Include trace ID for debugging
    });
  }
};

/**
 * Performance timer utility
 * Use this to measure performance of specific operations
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private traceId?: string;

  constructor(operation: string, traceId?: string) {
    this.operation = operation;
    this.traceId = traceId;
    this.startTime = Date.now();
  }

  /**
   * End the timer and log performance
   */
  end(additionalData?: Record<string, any>): number {
    const durationMs = Date.now() - this.startTime;
    
    logger.logPerformance({
      operation: this.operation,
      executionTimeMs: durationMs,
      context: {
        operation: this.operation,
        traceId: this.traceId,
      },
      additionalData,
    });

    return durationMs;
  }

  /**
   * Get current duration without ending timer
   */
  getCurrentDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Async performance wrapper
 * Automatically measures async function execution time
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  traceId?: string
): Promise<T> {
  const timer = new PerformanceTimer(operation, traceId);
  
  try {
    const result = await fn();
    timer.end({ status: 'success' });
    return result;
  } catch (error) {
    timer.end({ status: 'error', error: (error as Error).message });
    throw error;
  }
}