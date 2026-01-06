<<<<<<< HEAD
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { processWorkflow1 } from "./api/processWorlflow1.js";
import { logger } from "./utils/logger.js";
import { monitoringMiddleware, errorHandlingMiddleware } from "./utils/middleware.js";
import express from "express";

// Initialize Firebase Admin using the ESM API
const app = initializeApp();
const db = getFirestore(app);
=======
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import express from "express";

import { processWorkflow1 } from "./api/processGeneration.js";
import { logger } from "./utils/logger.js";
import {
  monitoringMiddleware,
  errorHandlingMiddleware,
} from "./utils/middleware.js";

// Initialize Firebase Admin
initializeApp();
export const db = getFirestore();
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)

// Log startup
logger.logStartup("Firebase Function initialized successfully");

<<<<<<< HEAD
// Export db if needed by other modules
export { db };
const expressApp = express();
expressApp.use(express.json());
expressApp.use(monitoringMiddleware);
expressApp.post("/", processWorkflow1);
expressApp.use(errorHandlingMiddleware);
/**
 * HTTP endpoint for Workflow 1 - processes both workflows automatically
 */
export const processWorkflow1HTTP = functions.https.onRequest(processWorkflow1);
=======
// Create Express app
const app = express();

app.use(express.json());
app.use(monitoringMiddleware);

// Route
app.post("/", processWorkflow1);

// Error handler
app.use(errorHandlingMiddleware);

// ✅ EXPORT EXPRESS APP
export const processWorkflow1HTTP = onRequest(
  {
    secrets: ["OPENROUTER_API_KEY","BACKEND_2_URL"],
  },
  app
);
>>>>>>> 9be87b2 (feat: add AI API requests and update context IDs across backend and frontend)
