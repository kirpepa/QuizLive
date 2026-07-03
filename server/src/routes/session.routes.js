import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { generateRoomCode } from '../lib/roomCode.js';

const router = Router();

// POST /api/sessions — organizer creates a live session (room) for a quiz.
router.post('/', requireAuth, requireRole('organizer'), async (req, res) => {
  const { quizId } = req.body || {};
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  });
  if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
  if (quiz.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Это не ваш квиз' });
  }
  if (quiz._count.questions === 0) {
    return res.status(400).json({ error: 'Нельзя запустить квиз без вопросов' });
  }

  // Generate a unique room code (retry on the rare collision).
  let roomCode;
  for (let i = 0; i < 5; i += 1) {
    roomCode = generateRoomCode();
    const clash = await prisma.quizSession.findUnique({ where: { roomCode } });
    if (!clash) break;
  }

  const session = await prisma.quizSession.create({
    data: { quizId: quiz.id, roomCode, status: 'pending' },
  });
  res.status(201).json({ session });
});

// GET /api/sessions/room/:code — public lookup so participants can validate a
// room code before attempting to join over WebSocket.
router.get('/room/:code', async (req, res) => {
  const session = await prisma.quizSession.findUnique({
    where: { roomCode: req.params.code.toUpperCase() },
    include: { quiz: { select: { title: true, category: true } } },
  });
  if (!session) return res.status(404).json({ error: 'Комната не найдена' });
  res.json({
    session: {
      roomCode: session.roomCode,
      status: session.status,
      quizTitle: session.quiz.title,
      category: session.quiz.category,
    },
  });
});

export default router;
