import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';

import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import sendRouter from './routes/send.js';
import campaignsRouter from './routes/campaigns.js';
import templatesRouter from './routes/templates.js';
import settingsRouter from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.uploadsDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/send', sendRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/settings', settingsRouter);

// Serve client static build in production
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback for all non-API / non-upload routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error handler:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`\x1b[32m✔ Email App Server running at http://localhost:${config.port}\x1b[0m`);
});
