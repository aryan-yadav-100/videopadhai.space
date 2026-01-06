import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';

// Logging interface
interface LogContext {
  chatId?: string;
  userId?: string;
  operation?: string;
  step?: string;
  status?: 'processing' | 'completed' | 'failed' | 'success' | 'error';
  traceId?: string; // NEW: For distributed tracing
}

// Performance tracking interface
interface PerformanceMetrics {
  operation: string;
  executionTimeMs: number;
  context: LogContext;
  additionalData?: Record<string, any>;
}

// Error logging interface
interface ErrorDetails {
  error: Error | any;
  context: LogContext;
  message: string;
  additionalData?: Record<string, any>;
}

class Logger {
  private readonly serviceName: string;
  private readonly environment: string;

  constructor(serviceName: string = 'firebase-function') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Generate a trace ID for request correlation
   */
  generateTraceId(): string {
    return uuidv4();
  }

  /**
   * Standardized log entry with common fields (Loki-friendly)
   */
  private createBaseLogEntry(context: LogContext, additionalData?: Record<string, any>) {
    return {
      // Timestamp in ISO format
      timestamp: new Date().toISOString(),
      
      // Service identification (for Loki labels)
      service: this.serviceName,
      environment: this.environment,
      
      // Trace and context fields
      traceId: context.traceId || null,
      chatId: context.chatId || null,
      userId: context.userId || null,
      operation: context.operation || null,
      step: context.step || null,
      status: context.status || null,
      
      // Additional metadata
      ...additionalData
    };
  }

  /**
   * Log general information
   */
  logInfo(context: LogContext, message: string, metadata?: Record<string, any>): void {
    const logEntry = this.createBaseLogEntry(context, {
      message,
      level: 'INFO',
      severity: 'INFO', // For Cloud Logging compatibility
      ...metadata
    });

    functions.logger.info(message, logEntry);
  }

  /**
   * Log error with full context and stack trace
   */
  logError(errorDetails: ErrorDetails): void {
    const { error, context, message, additionalData } = errorDetails;
    
    const logEntry = this.createBaseLogEntry(context, {
      message,
      level: 'ERROR',
      severity: 'ERROR',
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack || null,
      errorName: error?.name || null,
      errorCode: error?.code || null, // For categorizing errors
      ...additionalData
    });

    functions.logger.error(message, logEntry);
  }

  /**
   * Log warning conditions
   */
  logWarning(context: LogContext, message: string, metadata?: Record<string, any>): void {
    const logEntry = this.createBaseLogEntry(context, {
      message,
      level: 'WARN',
      severity: 'WARNING',
      ...metadata
    });

    functions.logger.warn(message, logEntry);
  }

  /**
   * Log debug information (only in development)
   */
  logDebug(context: LogContext, message: string, metadata?: Record<string, any>): void {
    if (this.environment !== 'production') {
      const logEntry = this.createBaseLogEntry(context, {
        message,
        level: 'DEBUG',
        severity: 'DEBUG',
        ...metadata
      });

      functions.logger.debug(message, logEntry);
    }
  }

  /**
   * Log workflow progression with standardized format
   */
  logWorkflowProgress(
    chatId: string, 
    userId: string, 
    workflowType: 1 | 2,
    step: string, 
    status: 'processing' | 'completed' | 'failed',
    traceId?: string
  ): void {
    this.logInfo(
      { 
        chatId, 
        userId, 
        operation: `workflow_${workflowType}`,
        step,
        status,
        traceId
      },
      `Workflow ${workflowType} - ${step}`,
      { 
        workflowType,
        progressUpdate: true 
      }
    );
  }

  /**
   * Log performance metrics for expensive operations
   */
  logPerformance(metrics: PerformanceMetrics): void {
    const { operation, executionTimeMs, context, additionalData } = metrics;
    
    this.logInfo(
      context,
      `Performance: ${operation} completed in ${executionTimeMs}ms`,
      {
        performanceMetrics: true,
        executionTimeMs,
        operation,
        // Add latency buckets for Prometheus
        latencyBucket: this.getLatencyBucket(executionTimeMs),
        ...additionalData
      }
    );
  }

  /**
   * Helper to categorize latency for better metrics
   */
  private getLatencyBucket(ms: number): string {
    if (ms < 100) return 'fast';
    if (ms < 500) return 'medium';
    if (ms < 1000) return 'slow';
    if (ms < 5000) return 'very_slow';
    return 'timeout_risk';
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    userId: string | null, 
    event: 'success' | 'failure' | 'invalid_origin',
    additionalInfo?: Record<string, any>
  ): void {
    const context: LogContext = {
      userId: userId || undefined,
      operation: 'authentication',
      status: event === 'success' ? 'success' : 'error'
    };

    const message = `Auth ${event}${userId ? ` for user ${userId}` : ''}`;

    if (event === 'success') {
      this.logInfo(context, message, { authEvent: true, authResult: event, ...additionalInfo });
    } else {
      this.logWarning(context, message, { authEvent: true, authResult: event, ...additionalInfo });
    }
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(
    userId: string,
    event: 'allowed' | 'blocked' | 'reset',
    currentCount: number,
    limit: number,
    additionalInfo?: Record<string, any>
  ): void {
    const context: LogContext = {
      userId,
      operation: 'rate_limiting',
      status: event === 'blocked' ? 'error' : 'success'
    };

    const message = `Rate limit ${event} - ${currentCount}/${limit} requests`;

    if (event === 'blocked') {
      this.logWarning(context, message, { 
        rateLimitEvent: true,
        rateLimitStatus: event,
        currentCount,
        limit,
        utilizationPercent: (currentCount / limit) * 100,
        ...additionalInfo 
      });
    } else {
      this.logInfo(context, message, { 
        rateLimitEvent: true,
        rateLimitStatus: event,
        currentCount,
        limit,
        utilizationPercent: (currentCount / limit) * 100,
        ...additionalInfo 
      });
    }
  }

  /**
   * Log API calls to external services (GPT, etc.)
   */
  logExternalApiCall(
    service: 'openai' | 'firestore' | 'backend_2',
    operation: string,
    context: LogContext,
    result: 'success' | 'error',
    executionTimeMs?: number,
    additionalData?: Record<string, any>
  ): void {
    const message = `${service.toUpperCase()} API - ${operation} ${result}`;
    
    const logData = {
      externalApiCall: true,
      externalService: service,
      apiOperation: operation,
      result,
      executionTimeMs: executionTimeMs || null,
      ...additionalData
    };

    if (result === 'success') {
      this.logInfo(context, message, logData);
    } else {
      this.logError({
        error: additionalData?.error || new Error('External API call failed'),
        context,
        message,
        additionalData: logData
      });
    }
  }

  /**
   * Log HTTP request events (NEW: Enhanced for metrics)
   */
  logHttpRequest(
    method: string,
    endpoint: string,
    status: number,
    userId?: string,
    executionTimeMs?: number,
    traceId?: string,
    additionalData?: Record<string, any>
  ): void {
    const context: LogContext = {
      userId,
      operation: 'http_request',
      status: status >= 200 && status < 300 ? 'success' : 'error',
      traceId
    };

    const message = `${method} ${endpoint} - ${status}`;

    this.logInfo(context, message, {
      httpRequest: true,
      httpMethod: method,
      httpEndpoint: endpoint,
      httpStatusCode: status,
      httpStatusClass: Math.floor(status / 100) + 'xx', // 2xx, 4xx, 5xx
      executionTimeMs: executionTimeMs || null,
      latencyBucket: executionTimeMs ? this.getLatencyBucket(executionTimeMs) : null,
      ...additionalData
    });
  }

  /**
   * Log startup/initialization events
   */
  logStartup(message: string, metadata?: Record<string, any>): void {
    this.logInfo(
      { operation: 'startup' },
      message,
      { 
        startupEvent: true,
        environment: this.environment,
        ...metadata 
      }
    );
  }

  /**
   * NEW: Log validation failures
   */
  logValidationFailure(
    context: LogContext,
    validationType: string,
    failedChecks: string[],
    reasons: string[],
    additionalData?: Record<string, any>
  ): void {
    this.logWarning(context, `Validation failed: ${validationType}`, {
      validationEvent: true,
      validationType,
      failedChecks,
      failureReasons: reasons,
      failureCount: reasons.length,
      ...additionalData
    });
  }
}

// Export singleton instance
export const logger = new Logger('workflow-service');

// Export class for custom instances if needed
export { Logger };