import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { setupSocketIO } from './socket.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import pairingRoutes from './routes/pairing.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import questionsRoutes from './routes/questions.routes.js';
import photosRoutes from './routes/photos.routes.js';
import gamesRoutes from './routes/games.routes.js';
import canvasRoutes from './routes/canvas.routes.js';
import chatRoutes from './routes/chat.routes.js';
import memoriesRoutes from './routes/memories.routes.js';
import dateIdeasRoutes from './routes/date-ideas.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import achievementsRoutes from './routes/achievements.routes.js';
import securityRoutes from './routes/security.routes.js';
import spaceRoutes from './routes/space.routes.js';
import drawingRoutes from './routes/drawing.routes.js';
import photoRoutes from './routes/photo.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Setup Socket.IO
setupSocketIO(server);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or matching dev origins
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.resolve('uploads')));

// Root landing & health status
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Togetherly API Server',
    tagline: 'A little moment. A stronger connection.',
    database: 'Neon PostgreSQL (Connected)',
    realtime: 'Socket.IO Active',
    time: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      pairing: '/api/pairing',
      dashboard: '/api/dashboard',
      questions: '/api/questions',
      chat: '/api/chat',
    },
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Togetherly API',
    tagline: 'A little moment. A stronger connection.',
    time: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Togetherly API',
    tagline: 'A little moment. A stronger connection.',
    time: new Date().toISOString(),
  });
});

// Redesigned Two-Person Anonymous Space, Drawing, Photo & Offline Delivery
app.use('/api/space', spaceRoutes);
app.use('/api/drawing', drawingRoutes);
app.use('/api/photo', photoRoutes);
app.use('/api/delivery', deliveryRoutes);

// Legacy routes (safe backwards compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/pairing', pairingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/date-ideas', dateIdeasRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/security', securityRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred',
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Togetherly Server running on http://0.0.0.0:${PORT}`);
  console.log(`Socket.IO real-time engine ready`);
});

