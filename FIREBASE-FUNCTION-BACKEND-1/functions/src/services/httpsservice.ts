import { logger } from '../utils/logger.js';

// You'll need to replace this with your actual Python backend URL
const BACKEND_2_URL = 'https://your-python-backend-url.com/api/endpoint';

interface BackendPayload {
  userId: string;
  chatId: string;
}

/**
 * Send HTTP POST request to Backend 2 (Python) with retry logic
 */
export const sendToBackend2 = async (userId: string, chatId: string): Promise<void> => {
  const payload: BackendPayload = {
    userId,
    chatId
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(BACKEND_2_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        logger.logInfo(
          { userId, chatId, operation: 'backend_2_request' },
          `HTTP POST success on attempt ${attempt}`,
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
      logger.logWarning(
        { userId, chatId, operation: 'backend_2_request' },
        `HTTP POST failed attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          attempt,
          url: BACKEND_2_URL,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      if (attempt === 3) {
        throw new Error(`Failed to send request to Backend 2 after 3 attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 5 second delay before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};