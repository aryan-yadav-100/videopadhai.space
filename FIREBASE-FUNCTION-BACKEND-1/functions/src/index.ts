import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { processWorkflow1 } from "./api/processWorlflow1.js";
import { logger } from "./utils/logger.js";

// Initialize Firebase Admin using the ESM API
const app = initializeApp();
const db = getFirestore(app);

// Log startup
logger.logStartup("Firebase Function initialized successfully");

// Export db if needed by other modules
export { db };

/**
 * HTTP endpoint for Workflow 1 - processes both workflows automatically
 */
export const processWorkflow1HTTP = functions.https.onRequest(processWorkflow1);
