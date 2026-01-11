import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import express from "express";
import cors from "cors";

import { processWorkflow1 } from "./api/processGeneration.js";
import {
  monitoringMiddleware,
  errorHandlingMiddleware,
} from "./utils/middleware.js";

// Initialize Firebase Admin
initializeApp();
export const db = getFirestore();

// Log startup
console.log("Firebase Function initialized");

// Create Express app
const app = express();

// ✅ CORS Configuration
const ALLOWED_ORIGINS = [
  'http://localhost:4000',
  'https://videopadhai-space-git-main-aryan10os-projects.vercel.app',
  'https://videopadhai-space-4og6l522h-aryan10os-projects.vercel.app',
  'https://www.videopadhai.space/',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or server-to-server)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(monitoringMiddleware);

// Route
app.post("/", processWorkflow1);

// Error handler
app.use(errorHandlingMiddleware);

// ✅ EXPORT EXPRESS APP
export const processWorkflow1HTTP = onRequest(
  {
    secrets: ["OPENROUTER_API_KEY", "BACKEND_2_URL"],
    cors: true
  },
  app
);
