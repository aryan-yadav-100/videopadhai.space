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
 * Send HTTP POST request to Backend 2 (Python) with retry logic
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

  for (let attempt = 1; attempt <= 3; attempt++) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      const response = await fetch(BACKEND_2_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-ID': traceId ?? 'unknown'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

      if (response.ok) {
        recordExternalApiCall(
          'backend_2',
          'post_workflow_complete',
          'success',
          durationMs / 1000
        );

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
          durationMs
        }
      );

      if (attempt === 3) {
        const finalError = new Error(
          `Failed to send request to Backend 2 after 3 attempts`
        );

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

      // retry delay
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
