import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin app only once
const app = getApps().length ? getApp() : initializeApp();
const db = getFirestore(app);

/**
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
 * Get final answer
 */
export const getFinalAnswer = async (chatId: string): Promise<string | null> => {
  const doc = await db.collection("finalAnswers").doc(chatId).get();
  return doc.exists ? (doc.data()?.answer as string) ?? null : null;
};
