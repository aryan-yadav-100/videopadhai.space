import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// Allowed domains for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:4000',
  'http://localhost:4001',
  'videopadhai-space-git-main-aryan10os-projects.vercel.app',      // Replace with your actual domain
  'videopadhai-space-4og6l522h-aryan10os-projects.vercel.app',
  'https://www.videopadhai.space/'
];

/**
 * Check if origin is allowed
 */
const isAllowedOrigin = (origin: string | undefined): boolean => {
  return origin ? ALLOWED_ORIGINS.includes(origin) : false;
};

/**
 * Generate unique user ID
 */
const generateUserId = (): string => {
  return uuidv4();
};

/**
 * Generate unique chat ID
 */
const generateChatId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `chat_${timestamp}_${random}`;
};

/**
 * Main auth function - validates request and returns user/chat IDs
 */
export const validateRequest = (req: Request) => {
  // Check CORS
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    logger.logWarning(
      { operation: 'auth' },
      'Blocked request from invalid origin',
      { origin }
    );
    return { error: 'Forbidden' };
  }

  // Generate user ID and get/create chat ID
  const userId = generateUserId();
  const chatId = req.body?.chatId || generateChatId();

  logger.logInfo(
    { userId, chatId, operation: 'auth' },
    'Request authenticated',
    { origin }
  );
  return { userId, chatId };
};
const userId = generateUserId();
const chatId = generateChatId();

export const IDs =  {
  userId,
  chatId
}