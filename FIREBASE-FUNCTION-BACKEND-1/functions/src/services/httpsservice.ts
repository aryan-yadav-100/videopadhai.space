import { logger } from '../utils/logger.js';
import { recordExternalApiCall } from '../utils/metrics.js';

interface BackendPayload {
  userId: string;
  chatId: string;
  traceId?: string;
}

/**
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
 * Send HTTP POST request to Backend 2 (Python) - Fire and Forget
 * This triggers the render process but doesn't wait for completion.
 * Backend 2 will update Firestore when rendering is complete.
 */
export const sendToBackend2 = async (
  userId: string,
  chatId: string,
  traceId?: string
): Promise<void> => {

  const BACKEND_2_URL = getBackend2Url();

  const payload: BackendPayload = {
    userId,
    chatId,
    traceId
  };

  const startTime = Date.now();

  try {
    // Fire and forget - don't await the response
    fetch(BACKEND_2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-ID': traceId ?? 'unknown'
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      // Log connection errors but don't throw
      // Backend 2 might be down, but we don't want to block Backend 1
      const durationMs = Date.now() - startTime;
      
      logger.logWarning(
        { userId, chatId, operation: 'backend_2_request', traceId },
        `Failed to connect to Backend 2: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          url: BACKEND_2_URL,
          durationMs
        }
      );

      recordExternalApiCall(
        'backend_2',
        'post_workflow_trigger',
        'error',
        durationMs / 1000
      );
    });

    // Log that we triggered the request (not that it completed)
    logger.logInfo(
      { userId, chatId, operation: 'backend_2_request', traceId },
      'Render request sent to Backend 2 (fire-and-forget)',
      {
        url: BACKEND_2_URL
      }
    );

    recordExternalApiCall(
      'backend_2',
      'post_workflow_trigger',
      'success',
      (Date.now() - startTime) / 1000
    );

  } catch (error) {
    // Only catch errors in setting up the request (not connection errors)
    const durationMs = Date.now() - startTime;
    
    logger.logError({
      error: error as Error,
      context: { userId, chatId, operation: 'backend_2_request', traceId },
      message: 'Failed to send request to Backend 2',
      additionalData: {
        url: BACKEND_2_URL,
        durationMs
      }
    });

    recordExternalApiCall(
      'backend_2',
      'post_workflow_trigger',
      'error',
      durationMs / 1000
    );

    // Don't throw - let Backend 1 continue its workflow
    // The user will see the status update in Firestore when Backend 2 completes
  }
};