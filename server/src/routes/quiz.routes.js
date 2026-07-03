import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { uploadImage } from '../lib/upload.js';

const router = Router();

// All quiz-management routes require an authenticated organizer.
router.use(requireAuth, requireRole('organizer'));

// Loads a quiz and verifies the current user owns it.
async function loadOwnedQuiz(req, res) {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) {
    res.status(404).json({ error: 'Квиз не найден' });
    return null;
  }
  if (quiz.ownerId !== req.user.id) {
    res.status(403).json({ error: 'Это не ваш квиз' });
    return null;
  }
  return quiz;
}

const quizInclude = {
  questions: {
    orderBy: { orderIndex: 'asc' },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  },
};

// Validates and normalizes a question payload. Returns { data } or { error }.
function normalizeQuestion(body, orderIndex) {
  const type = body.type === 'image' ? 'image' : 'text';
  const answerType = body.answerType === 'multiple' ? 'multiple' : 'single';
  const text = (body.text || '').trim();
  const options = Array.isArray(body.options) ? body.options : [];

  if (!text) return { error: 'Текст вопроса обязателен' };
  if (options.length < 2 || options.length > 6) {
    return { error: 'Нужно от 2 до 6 вариантов ответа' };
  }
  const cleaned = options.map((o, i) => ({
    text: (o.text || '').trim(),
    isCorrect: Boolean(o.isCorrect),
    orderIndex: i,
  }));
  if (cleaned.some((o) => !o.text)) {
    return { error: 'Все варианты ответа должны быть заполнены' };
  }
  const correctCount = cleaned.filter((o) => o.isCorrect).length;
  if (correctCount === 0) {
    return { error: 'Отметьте хотя бы один правильный вариант' };
  }
  if (answerType === 'single' && correctCount !== 1) {
    return { error: 'Для одиночного выбора должен быть ровно один правильный вариант' };
  }

  return {
    data: {
      type,
      answerType,
      text,
      imageUrl: body.imageUrl || null,
      timeLimit: body.timeLimit ? Number(body.timeLimit) : null,
      orderIndex,
      options: cleaned,
    },
  };
}

// GET /api/quizzes — list organizer's quizzes with question counts.
router.get('/', async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { questions: true, sessions: true } } },
  });
  res.json({ quizzes });
});

// POST /api/quizzes — create a quiz shell.
router.post('/', async (req, res) => {
  const { title, description, category } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Название квиза обязательно' });
  }
  const quiz = await prisma.quiz.create({
    data: {
      ownerId: req.user.id,
      title: title.trim(),
      description: (description || '').trim(),
      category: (category || 'Общая').trim(),
      defaultTimePerQuestion: Number(req.body.defaultTimePerQuestion) || 20,
      allowAnswerChange: Boolean(req.body.allowAnswerChange),
      speedBonus: req.body.speedBonus === undefined ? true : Boolean(req.body.speedBonus),
    },
    include: quizInclude,
  });
  res.status(201).json({ quiz });
});

// GET /api/quizzes/:id — full quiz with questions and options.
router.get('/:id', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: quizInclude,
  });
  res.json({ quiz });
});

// PUT /api/quizzes/:id — update quiz settings.
router.put('/:id', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  const b = req.body || {};
  const quiz = await prisma.quiz.update({
    where: { id: req.params.id },
    data: {
      title: b.title !== undefined ? String(b.title).trim() : undefined,
      description: b.description !== undefined ? String(b.description).trim() : undefined,
      category: b.category !== undefined ? String(b.category).trim() : undefined,
      defaultTimePerQuestion:
        b.defaultTimePerQuestion !== undefined ? Number(b.defaultTimePerQuestion) : undefined,
      allowAnswerChange:
        b.allowAnswerChange !== undefined ? Boolean(b.allowAnswerChange) : undefined,
      speedBonus: b.speedBonus !== undefined ? Boolean(b.speedBonus) : undefined,
    },
    include: quizInclude,
  });
  res.json({ quiz });
});

// DELETE /api/quizzes/:id
router.delete('/:id', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  await prisma.quiz.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /api/quizzes/:id/questions — append a question with options.
router.post('/:id/questions', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;

  const count = await prisma.question.count({ where: { quizId: owned.id } });
  const norm = normalizeQuestion(req.body || {}, count);
  if (norm.error) return res.status(400).json({ error: norm.error });

  const { options, ...questionData } = norm.data;
  const question = await prisma.question.create({
    data: { ...questionData, quizId: owned.id, options: { create: options } },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  });
  res.status(201).json({ question });
});

// PUT /api/quizzes/:id/questions/:qid — replace a question and its options.
router.put('/:id/questions/:qid', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  const existing = await prisma.question.findFirst({
    where: { id: req.params.qid, quizId: owned.id },
  });
  if (!existing) return res.status(404).json({ error: 'Вопрос не найден' });

  const norm = normalizeQuestion(req.body || {}, existing.orderIndex);
  if (norm.error) return res.status(400).json({ error: norm.error });

  const { options, ...questionData } = norm.data;
  // Replace options wholesale — simplest correct approach for an MVP editor.
  const question = await prisma.$transaction(async (tx) => {
    await tx.answerOption.deleteMany({ where: { questionId: existing.id } });
    return tx.question.update({
      where: { id: existing.id },
      data: { ...questionData, options: { create: options } },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    });
  });
  res.json({ question });
});

// DELETE /api/quizzes/:id/questions/:qid
router.delete('/:id/questions/:qid', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  const existing = await prisma.question.findFirst({
    where: { id: req.params.qid, quizId: owned.id },
  });
  if (!existing) return res.status(404).json({ error: 'Вопрос не найден' });
  await prisma.question.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

// PUT /api/quizzes/:id/questions-order — persist a new question order.
router.put('/:id/questions-order', async (req, res) => {
  const owned = await loadOwnedQuiz(req, res);
  if (!owned) return;
  const order = Array.isArray(req.body.order) ? req.body.order : [];
  await prisma.$transaction(
    order.map((qid, i) =>
      prisma.question.updateMany({
        where: { id: qid, quizId: owned.id },
        data: { orderIndex: i },
      })
    )
  );
  res.json({ ok: true });
});

// POST /api/quizzes/upload — upload a question image, returns its public URL.
router.post('/upload', uploadImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

export default router;
