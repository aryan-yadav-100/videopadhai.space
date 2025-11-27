import { logger } from '../utils/logger.js';
import { recordExternalApiCall } from '../utils/metrics.js';

// You'll need to replace this with your actual Python backend URL
const BACKEND_2_URL = process.env.BACKEND_2_URL ;
if (!BACKEND_2_URL) {
  throw new Error('BACKEND_2_URL environment variable is not set');}

interface BackendPayload {
  userId: string;
  chatId: string;
  traceId?: string;
}

/**
 * Send HTTP POST request to Backend 2 (Python) with retry logic
 */
export const sendToBackend2 = async (
  userId: string, 
  chatId: string,
  traceId?: string
): Promise<void> => {
  const payload: BackendPayload = {
    userId,
    chatId,
    traceId
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(BACKEND_2_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-ID': traceId || 'unknown', // Pass trace ID in header
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

      if (response.status === 200) {
        // Record successful API call
        recordExternalApiCall('backend_2', 'post_workflow_complete', 'success', durationMs / 1000);
        
        logger.logExternalApiCall(
          'backend_2',
          'post_workflow_complete',
          { userId, chatId, operation: 'backend_2_request', traceId },
          'success',
          durationMs,
          { 
            statusCode: response.status,
            attempt,
            url: BACKEND_2_URL
          }
        );
        
        return; // Success - fire and forget
      } else {
        throw new Error(`Backend 2 returned status ${response.status}`);
      }

    } catch (error) {
      const durationMs = Date.now() - startTime;
      
      // Record failed attempt
      if (attempt === 3) {
        // Only record as error on final failure
        recordExternalApiCall('backend_2', 'post_workflow_complete', 'error', durationMs / 1000);
      }
      
      logger.logWarning(
        { userId, chatId, operation: 'backend_2_request', traceId },
        `HTTP POST failed attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          attempt,
          maxAttempts: 3,
          url: BACKEND_2_URL,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs
        }
      );

      if (attempt === 3) {
        const finalError = new Error(`Failed to send request to Backend 2 after 3 attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        logger.logError({
          error: finalError,
          context: { userId, chatId, operation: 'backend_2_request', traceId },
          message: 'Backend 2 request failed after all retries',
          additionalData: {
            attempts: 3,
            url: BACKEND_2_URL
          }
        });
        
        throw finalError;
      }

      // 5 second delay before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};