import { logger } from '../utils/logger.js';
import { recordExternalApiCall } from '../utils/metrics.js';

<<<<<<< HEAD
// You'll need to replace this with your actual Python backend URL
const BACKEND_2_URL = process.env.BACKEND_2_URL ;
if (!BACKEND_2_URL) {
  throw new Error('BACKEND_2_URL environment variable is not set');}

=======
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
interface BackendPayload {
  userId: string;
  chatId: string;
  traceId?: string;
}

/**
<<<<<<< HEAD
 * Send HTTP POST request to Backend 2 (Python) with retry logic
 */
export const sendToBackend2 = async (
  userId: string, 
  chatId: string,
  traceId?: string
): Promise<void> => {
=======
 * Safely get Backend 2 URL at runtime
 * (DO NOT read config at module load time)
 */
function getBackend2Url(): string {
  const url = process.env.BACKEND_2_URL;
  if (!url) {
    throw new Error('backend2.url is not set in Firebase Functions secrets');
  }

  return url;
}

/**
 * Send HTTP POST request to Backend 2 (Python) with retry logic
 */
export const sendToBackend2 = async (
  userId: string,
  chatId: string,
  traceId?: string
): Promise<void> => {

  const BACKEND_2_URL = getBackend2Url();

>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
  const payload: BackendPayload = {
    userId,
    chatId,
    traceId
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const startTime = Date.now();
<<<<<<< HEAD
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
=======

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)

      const response = await fetch(BACKEND_2_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
<<<<<<< HEAD
          'X-Trace-ID': traceId || 'unknown', // Pass trace ID in header
=======
          'X-Trace-ID': traceId ?? 'unknown'
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

<<<<<<< HEAD
      if (response.status === 200) {
        // Record successful API call
        recordExternalApiCall('backend_2', 'post_workflow_complete', 'success', durationMs / 1000);
        
=======
      if (response.ok) {
        recordExternalApiCall(
          'backend_2',
          'post_workflow_complete',
          'success',
          durationMs / 1000
        );

>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
        logger.logExternalApiCall(
          'backend_2',
          'post_workflow_complete',
          { userId, chatId, operation: 'backend_2_request', traceId },
          'success',
          durationMs,
<<<<<<< HEAD
          { 
=======
          {
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
            statusCode: response.status,
            attempt,
            url: BACKEND_2_URL
          }
        );
<<<<<<< HEAD
        
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
=======

        return; // success
      }

      throw new Error(`Backend 2 returned status ${response.status}`);

    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (attempt === 3) {
        recordExternalApiCall(
          'backend_2',
          'post_workflow_complete',
          'error',
          durationMs / 1000
        );
      }

      logger.logWarning(
        { userId, chatId, operation: 'backend_2_request', traceId },
        `HTTP POST failed attempt ${attempt}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          attempt,
          maxAttempts: 3,
          url: BACKEND_2_URL,
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
          durationMs
        }
      );

      if (attempt === 3) {
<<<<<<< HEAD
        const finalError = new Error(`Failed to send request to Backend 2 after 3 attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
=======
        const finalError = new Error(
          `Failed to send request to Backend 2 after 3 attempts`
        );

>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
        logger.logError({
          error: finalError,
          context: { userId, chatId, operation: 'backend_2_request', traceId },
          message: 'Backend 2 request failed after all retries',
          additionalData: {
            attempts: 3,
            url: BACKEND_2_URL
          }
        });
<<<<<<< HEAD
        
        throw finalError;
      }

      // 5 second delay before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
=======

        throw finalError;
      }

      // retry delay
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
