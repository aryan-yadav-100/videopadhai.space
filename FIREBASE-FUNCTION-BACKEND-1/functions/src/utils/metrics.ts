/**
 * Prometheus Metrics for Firebase Functions
 * 
 * Since Firebase Functions are serverless and ephemeral, we use Push Gateway
 * to push metrics instead of having Prometheus scrape them.
 */

import { Registry, Counter, Histogram, Gauge, pushMetrics } from 'prom-client';
import { logger } from './logger.js';

// Create a custom registry
const register = new Registry();

// Default labels for all metrics
register.setDefaultLabels({
  service: 'workflow-service',
  environment: process.env.NODE_ENV || 'development',
});

// ==================== HTTP METRICS ====================

/**
 * Counter: Total HTTP requests
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status_code', 'status_class'],
  registers: [register],
});

/**
 * Histogram: HTTP request duration
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms, 500ms, 1s, 2s, 5s, 10s, 30s
  registers: [register],
});

// ==================== WORKFLOW METRICS ====================

/**
 * Counter: Workflow executions
 */
export const workflowExecutionsTotal = new Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_type', 'status'], // status: success, failed
  registers: [register],
});

/**
 * Histogram: Workflow execution duration
 */
export const workflowExecutionDuration = new Histogram({
  name: 'workflow_execution_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['workflow_type', 'step'],
  buckets: [1, 5, 10, 30, 60, 120, 300], // 1s to 5min
  registers: [register],
});

/**
 * Gauge: Active workflows (currently processing)
 */
export const activeWorkflows = new Gauge({
  name: 'active_workflows',
  help: 'Number of workflows currently being processed',
  labelNames: ['workflow_type'],
  registers: [register],
});

// ==================== EXTERNAL API METRICS ====================

/**
 * Counter: External API calls
 */
export const externalApiCallsTotal = new Counter({
  name: 'external_api_calls_total',
  help: 'Total number of external API calls',
  labelNames: ['service', 'operation', 'status'], // service: openai, firestore, backend_2
  registers: [register],
});

/**
 * Histogram: External API call duration
 */
export const externalApiCallDuration = new Histogram({
  name: 'external_api_call_duration_seconds',
  help: 'External API call duration in seconds',
  labelNames: ['service', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// ==================== RATE LIMITING METRICS ====================

/**
 * Counter: Rate limit events
 */
export const rateLimitEventsTotal = new Counter({
  name: 'rate_limit_events_total',
  help: 'Total number of rate limit events',
  labelNames: ['event_type', 'limit_type'], // event: allowed, blocked | type: user, daily
  registers: [register],
});

/**
 * Gauge: Current rate limit usage
 */
export const rateLimitUsage = new Gauge({
  name: 'rate_limit_usage',
  help: 'Current rate limit usage (0-1)',
  labelNames: ['limit_type'], // user or daily
  registers: [register],
});

// ==================== VALIDATION METRICS ====================

/**
 * Counter: Input validation failures
 */
export const validationFailuresTotal = new Counter({
  name: 'validation_failures_total',
  help: 'Total number of input validation failures',
  labelNames: ['validation_type', 'check_failed'], // type: topic | check: profanity, injection, etc.
  registers: [register],
});

// ==================== ERROR METRICS ====================

/**
 * Counter: Application errors
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'operation'],
  registers: [register],
});

// ==================== BUSINESS METRICS ====================

/**
 * Counter: GPT token usage (if you want to track costs)
 */
export const gptTokensUsed = new Counter({
  name: 'gpt_tokens_used_total',
  help: 'Total number of GPT tokens used',
  labelNames: ['model', 'workflow_type'],
  registers: [register],
});

// ==================== PUSH TO PROMETHEUS PUSH GATEWAY ====================

/**
 * Push all metrics to Prometheus Push Gateway
 * Call this at the end of each request
 */
export const pushMetricsToGateway = async (): Promise<void> => {
  const pushGatewayUrl = process.env.PROMETHEUS_PUSH_GATEWAY_URL || 'http://localhost:9091';
  
  try {
    await pushMetrics({
      pushgateway: pushGatewayUrl,
      jobName: 'firebase_functions',
      registers: [register],
    });
    
    logger.logDebug(
      { operation: 'metrics_push' },
      'Metrics pushed to Prometheus Push Gateway',
      { pushGatewayUrl }
    );
  } catch (error) {
    // Don't fail the request if metrics push fails
    logger.logWarning(
      { operation: 'metrics_push', status: 'error' },
      'Failed to push metrics to gateway',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        pushGatewayUrl 
      }
    );
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Record HTTP request metrics
 */
export const recordHttpRequest = (
  method: string,
  endpoint: string,
  statusCode: number,
  durationSeconds: number
): void => {
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  
  httpRequestsTotal.inc({
    method,
    endpoint,
    status_code: statusCode.toString(),
    status_class: statusClass,
  });
  
  httpRequestDuration.observe(
    {
      method,
      endpoint,
      status_code: statusCode.toString(),
    },
    durationSeconds
  );
};

/**
 * Record workflow execution
 */
export const recordWorkflowExecution = (
  workflowType: '1' | '2',
  status: 'success' | 'failed',
  durationSeconds: number,
  step?: string
): void => {
  workflowExecutionsTotal.inc({
    workflow_type: workflowType,
    status,
  });
  
  if (step) {
    workflowExecutionDuration.observe(
      {
        workflow_type: workflowType,
        step,
      },
      durationSeconds
    );
  }
};

/**
 * Track active workflow start/end
 */
export const trackWorkflowActive = (workflowType: '1' | '2', isStart: boolean): void => {
  if (isStart) {
    activeWorkflows.inc({ workflow_type: workflowType });
  } else {
    activeWorkflows.dec({ workflow_type: workflowType });
  }
};

/**
 * Record external API call
 */
export const recordExternalApiCall = (
  service: 'openai' | 'firestore' | 'backend_2',
  operation: string,
  status: 'success' | 'error',
  durationSeconds?: number
): void => {
  externalApiCallsTotal.inc({
    service,
    operation,
    status,
  });
  
  if (durationSeconds !== undefined) {
    externalApiCallDuration.observe(
      {
        service,
        operation,
      },
      durationSeconds
    );
  }
};

/**
 * Record rate limit event
 */
export const recordRateLimitEvent = (
  eventType: 'allowed' | 'blocked',
  limitType: 'user' | 'daily',
  currentCount: number,
  limit: number
): void => {
  rateLimitEventsTotal.inc({
    event_type: eventType,
    limit_type: limitType,
  });
  
  rateLimitUsage.set(
    { limit_type: limitType },
    currentCount / limit
  );
};

/**
 * Record validation failure
 */
export const recordValidationFailure = (
  validationType: string,
  checkFailed: string
): void => {
  validationFailuresTotal.inc({
    validation_type: validationType,
    check_failed: checkFailed,
  });
};

/**
 * Record error
 */
export const recordError = (
  errorType: string,
  operation: string
): void => {
  errorsTotal.inc({
    error_type: errorType,
    operation,
  });
};

// Export registry for testing/debugging
export { register };