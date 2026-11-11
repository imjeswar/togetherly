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

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Setup Socket.IO
setupSocketIO(server);

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.resolve('uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Togetherly API',
    tagline: 'A little moment. A stronger connection.',
    time: new Date().toISOString(),
  });
});

// API Routes
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

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred',
  });
});

server.listen(PORT, () => {
  console.log(`Togetherly Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO real-time engine ready`);
});
