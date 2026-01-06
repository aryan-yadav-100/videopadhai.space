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

// Log startup
logger.logStartup("Firebase Function initialized successfully");

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
