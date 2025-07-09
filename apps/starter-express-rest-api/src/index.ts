import express from 'express';

import { expressAdapter } from '@igniter-js/core/adapters';
import { AppRouter } from './igniter.router'

const app = express();

// Serve Igniter.js Router
app.use('/api/v1', expressAdapter(AppRouter.handler));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
