import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin app only once
const app = getApps().length ? getApp() : initializeApp();
const db = getFirestore(app);

/**
<<<<<<< HEAD
 * Save workflow state
 */
export const saveWorkflow = async (chatId: string, userId: string, data: any) => {
  await db.collection("workflows").doc(chatId).set(
    {
      ...data,
      chatId,
      ownerId: userId,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
};

/**
 * Save final answer
=======
 * Save final answer/generated code
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
 */
export const saveFinalAnswer = async (chatId: string, userId: string, answer: string) => {
  await db.collection("finalAnswers").doc(chatId).set({
    chatId,
    ownerId: userId,
    answer,
    createdAt: Timestamp.now(),
  });
};

/**
<<<<<<< HEAD
 * Get final answer
=======
 * Get final answer/generated code
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
 */
export const getFinalAnswer = async (chatId: string): Promise<string | null> => {
  const doc = await db.collection("finalAnswers").doc(chatId).get();
  return doc.exists ? (doc.data()?.answer as string) ?? null : null;
};
<<<<<<< HEAD
=======

/**
 * Save generation metadata (optional - for tracking)
 */
export const saveGenerationMetadata = async (
  chatId: string, 
  userId: string, 
  data: {
    topic: string;
    status: 'processing' | 'completed' | 'failed';
    generatedCode?: string;
    error?: string;
  }
) => {
  await db.collection("generations").doc(chatId).set(
    {
      ...data,
      chatId,
      ownerId: userId,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
};
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
