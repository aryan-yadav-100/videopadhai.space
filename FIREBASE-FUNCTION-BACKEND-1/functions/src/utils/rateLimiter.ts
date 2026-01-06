import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "./logger.js";
import { recordRateLimitEvent } from "./metrics.js";

// Ensure only one app instance
const app = getApps().length ? getApp() : initializeApp();
const db = getFirestore(app);

/**
 * Check both user and daily rate limits, update counters if allowed
 */
export const checkRateLimit = async (userId: string) => {
  try {
    // Get user count
    const userDocRef = db.collection("rateLimits").doc(userId);
    const userDoc = await userDocRef.get();
    const userCount = userDoc.exists ? userDoc.data()?.totalRequests || 0 : 0;

    if (userCount >= 2) {
      // Record blocked event with metrics
      recordRateLimitEvent('blocked', 'user', userCount, 2);
      
      logger.logRateLimit(userId, 'blocked', userCount, 2, {
        reason: 'user_limit_exceeded'
      });
      
      return { allowed: false, reason: "user_limit_exceeded" };
    }

    // Get daily count
    const today = new Date().toISOString().split("T")[0];
    const dailyDocRef = db.collection("rateLimits").doc("global_daily");
    const dailyDoc = await dailyDocRef.get();
    const dailyData = dailyDoc.exists ? dailyDoc.data() : {};
    const dailyCount = dailyData?.date === today ? dailyData.totalRequests || 0 : 0;

    if (dailyCount >= 10) {
      // Record blocked event with metrics
      recordRateLimitEvent('blocked', 'daily', dailyCount, 10);
      
      logger.logRateLimit(userId, 'blocked', dailyCount, 10, {
        reason: 'daily_limit_exceeded'
      });
      
      return { allowed: false, reason: "daily_limit_exceeded" };
    }

    // Update both counters
    await userDocRef.set({ totalRequests: userCount + 1 }, { merge: true });
    await dailyDocRef.set(
      { date: today, totalRequests: dailyCount + 1 },
      { merge: true }
    );

    // Record allowed events with metrics
    recordRateLimitEvent('allowed', 'user', userCount + 1, 2);
    recordRateLimitEvent('allowed', 'daily', dailyCount + 1, 10);

    logger.logRateLimit(
      userId,
      'allowed',
      userCount + 1,
      2,
      {
        userCount: userCount + 1,
        dailyCount: dailyCount + 1,
        userLimit: 2,
        dailyLimit: 10
      }
    );

    return { allowed: true };
    
  } catch (error) {
    logger.logError({
      error,
      context: { userId, operation: "rate_limit" },
      message: "Rate limit check failed",
    });

    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
};