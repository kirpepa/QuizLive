import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { UPLOAD_DIR } from './lib/upload.js';
import { initSockets } from './socket/sessionManager.js';

import authRoutes from './routes/auth.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import sessionRoutes from './routes/session.routes.js';
import meRoutes from './routes/me.routes.js';

const app = express();

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Serve uploaded question images.
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/me', meRoutes);

// Centralized error handler (e.g. multer file-size/type errors).
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || 'Ошибка сервера' });
});

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: config.clientOrigin, credentials: true },
});
initSockets(io);

server.listen(config.port, () => {
  console.log(`API + WebSocket слушают на http://localhost:${config.port}`);
});
