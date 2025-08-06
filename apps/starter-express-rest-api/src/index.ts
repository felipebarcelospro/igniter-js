import express from 'express';

import { expressAdapter } from '@igniter-js/core/adapters';
import { AppRouter } from './igniter.router'

const app = express();

// Define the API base path from environment variable or default to '/api/v1'
const IGNITER_API_BASE_PATH = process.env.IGNITER_API_BASE_PATH || '/api/v1';
const PORT = process.env.PORT || 3000;

// Serve Igniter.js Router
app.use(IGNITER_API_BASE_PATH, expressAdapter(AppRouter.handler));

// Start the server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
