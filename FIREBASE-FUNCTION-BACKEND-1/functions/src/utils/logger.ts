import * as functions from 'firebase-functions';

// logging interface
interface LogContext {
  chatId?: string;
  userId?: string;
  operation?: string;
  step?: string;
  status?: 'processing' | 'completed' | 'failed' | 'success' | 'error';
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

  constructor(serviceName: string = 'firebase-function') {
    this.serviceName = serviceName;
  }

  /**
   * standardized log entry with common fields
   */
  private createBaseLogEntry(context: LogContext, additionalData?: Record<string, any>) {
    return {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      chatId: context.chatId || null,
      userId: context.userId || null,
      operation: context.operation || null,
      step: context.step || null,
      status: context.status || null,
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
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack || null,
      errorName: error?.name || null,
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
      ...metadata
    });

    functions.logger.warn(message, logEntry);
  }

  /**
   * Log debug information (only in development)
   */
  logDebug(context: LogContext, message: string, metadata?: Record<string, any>): void {
    const logEntry = this.createBaseLogEntry(context, {
      message,
      level: 'DEBUG',
      ...metadata
    });

    functions.logger.debug(message, logEntry);
  }

  /**
   * Log workflow progression with standardized format
   */
  logWorkflowProgress(
    chatId: string, 
    userId: string, 
    workflowType: 1 | 2,
    step: string, 
    status: 'processing' | 'completed' | 'failed'
  ): void {
    this.logInfo(
      { 
        chatId, 
        userId, 
        operation: `workflow_${workflowType}`,
        step,
        status 
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
        ...additionalData
      }
    );
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    userId: string | null, 
    event: 'success' | 'failure' | 'invalid_key',
    additionalInfo?: Record<string, any>
  ): void {
    const context: LogContext = {
      userId: userId || undefined,
      operation: 'authentication',
      status: event === 'success' ? 'success' : 'error'
    };

    const message = `Auth ${event}${userId ? ` for user ${userId}` : ''}`;

    if (event === 'success') {
      this.logInfo(context, message, { authEvent: true, ...additionalInfo });
    } else {
      this.logWarning(context, message, { authEvent: true, ...additionalInfo });
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
        currentCount,
        limit,
        ...additionalInfo 
      });
    } else {
      this.logInfo(context, message, { 
        rateLimitEvent: true,
        currentCount,
        limit,
        ...additionalInfo 
      });
    }
  }

  /**
   * Log API calls to external services (GPT, etc.)
   */
  logExternalApiCall(
    service: 'openai' | 'firestore',
    operation: string,
    context: LogContext,
    result: 'success' | 'error',
    executionTimeMs?: number,
    additionalData?: Record<string, any>
  ): void {
    const message = `${service.toUpperCase()} API - ${operation} ${result}`;
    
    const logData = {
      externalApiCall: true,
      service,
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
   * Log HTTP request events
   */
  logHttpRequest(
    method: string,
    endpoint: string,
    status: number,
    userId?: string,
    executionTimeMs?: number,
    additionalData?: Record<string, any>
  ): void {
    const context: LogContext = {
      userId,
      operation: 'http_request',
      status: status >= 200 && status < 300 ? 'success' : 'error'
    };

    const message = `${method} ${endpoint} - ${status}`;

    this.logInfo(context, message, {
      httpRequest: true,
      method,
      endpoint,
      statusCode: status,
      executionTimeMs: executionTimeMs || null,
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
        ...metadata 
      }
    );
  }
}

// Export singleton instance
export const logger = new Logger('workflow-service');

// Export class for custom instances if needed
export { Logger };