import { nanoid } from 'nanoid';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { isAnswerCorrect, computeScore } from '../lib/scoring.js';

// In-memory state for every live room, keyed by roomCode. Holds the state of an
// in-progress session; results are persisted to the DB at reveal time.
const liveRooms = new Map();

// ----- helpers ---------------------------------------------------------------

function publicQuestion(room) {
  const q = room.currentQuestion;
  if (!q) return null;
  return {
    id: q.id,
    index: room.currentIndex,
    total: room.quiz.questions.length,
    type: q.type,
    answerType: q.answerType,
    text: q.text,
    imageUrl: q.imageUrl,
    // Options without the isCorrect flag — clients must never see the answer.
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
    timeLimitMs: room.questionTimeLimitMs,
    endsAt: room.questionEndsAt,
    serverNow: Date.now(),
  };
}

function leaderboard(room) {
  return [...room.participants.values()]
    .map((p) => ({
      participantId: p.id,
      nickname: p.nickname,
      score: p.score,
      connected: p.connected,
    }))
    .sort((a, b) => b.score - a.score);
}

function participantList(room) {
  return [...room.participants.values()].map((p) => ({
    participantId: p.id,
    nickname: p.nickname,
    connected: p.connected,
    score: p.score,
  }));
}

function questionTimeLimit(room, question) {
  const seconds = question.timeLimit || room.quiz.defaultTimePerQuestion || 20;
  return seconds * 1000;
}

// ----- lifecycle -------------------------------------------------------------

export function initSockets(io) {
  io.on('connection', (socket) => {
    // ---- organizer opens/hosts a session -----------------------------------
    socket.on('organizer:open', async ({ sessionId, token }, cb) => {
      try {
        const user = verifyAccessToken(token);
        const session = await prisma.quizSession.findUnique({
          where: { id: sessionId },
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { options: { orderBy: { orderIndex: 'asc' } } },
                },
              },
            },
          },
        });
        if (!session) return cb?.({ error: 'Сессия не найдена' });
        if (session.quiz.ownerId !== user.id) {
          return cb?.({ error: 'Это не ваша сессия' });
        }
        if (session.status === 'finished') {
          return cb?.({ error: 'Сессия уже завершена' });
        }

        let room = liveRooms.get(session.roomCode);
        if (!room) {
          room = {
            roomCode: session.roomCode,
            sessionId: session.id,
            quiz: session.quiz,
            status: 'lobby', // lobby | question | reveal | finished
            organizerSocketId: socket.id,
            participants: new Map(),
            currentIndex: -1,
            currentQuestion: null,
            questionEndsAt: null,
            questionTimeLimitMs: null,
            timer: null,
            answers: new Map(), // participantId -> { optionIds, correct, score }
            lastReveal: null, // cached reveal payload for mid-reveal reconnects
          };
          liveRooms.set(session.roomCode, room);
        } else {
          room.organizerSocketId = socket.id;
        }

        socket.data = { role: 'organizer', roomCode: session.roomCode, userId: user.id };
        socket.join(session.roomCode);

        cb?.({
          ok: true,
          roomCode: session.roomCode,
          quizTitle: session.quiz.title,
          status: room.status,
          participants: participantList(room),
          currentQuestion:
            room.status === 'question' || room.status === 'reveal' ? publicQuestion(room) : null,
          reveal: room.status === 'reveal' ? room.lastReveal : null,
          leaderboard: leaderboard(room),
        });
      } catch {
        cb?.({ error: 'Недействительный токен' });
      }
    });

    // ---- participant joins a room ------------------------------------------
    socket.on('room:join', async ({ roomCode, nickname, token, participantId, rejoinToken }, cb) => {
      const code = (roomCode || '').toUpperCase();
      const room = liveRooms.get(code);
      const dbSession = await prisma.quizSession.findUnique({ where: { roomCode: code } });
      if (!dbSession) return cb?.({ error: 'Комната не найдена' });
      if (dbSession.status === 'finished' || room?.status === 'finished') {
        return cb?.({ error: 'Квиз уже завершён' });
      }
      if (!room) {
        return cb?.({ error: 'Организатор ещё не открыл комнату' });
      }

      let userId = null;
      if (token) {
        try {
          userId = verifyAccessToken(token).id;
        } catch {
          // Guest fallback if the token is invalid.
        }
      }

      // Resolve the participant. Reconnecting to an existing entry is only
      // allowed if the caller proves ownership — either a matching rejoinToken
      // (issued on first join) or the same authenticated userId. This prevents
      // hijacking another player by guessing their (broadcast) participantId.
      let participant = null;
      if (participantId) {
        const existing = room.participants.get(participantId);
        if (
          existing &&
          ((rejoinToken && existing.rejoinToken === rejoinToken) ||
            (userId && existing.userId === userId))
        ) {
          participant = existing;
        }
      }
      // Dedup: a logged-in user always maps to a single participant per session,
      // even if they refreshed and lost their participantId/rejoinToken.
      if (!participant && userId) {
        participant =
          [...room.participants.values()].find((p) => p.userId === userId) || null;
      }

      if (participant) {
        participant.socketId = socket.id;
        participant.connected = true;
      } else {
        const nick = (nickname || '').trim();
        if (!nick) return cb?.({ error: 'Введите никнейм' });
        const dbParticipant = await prisma.sessionParticipant.create({
          data: { sessionId: room.sessionId, userId, nickname: nick },
        });
        participant = {
          id: dbParticipant.id,
          nickname: nick,
          userId,
          socketId: socket.id,
          score: 0,
          connected: true,
          rejoinToken: nanoid(), // secret proof for future reconnects
        };
        room.participants.set(participant.id, participant);
      }

      socket.data = { role: 'participant', roomCode: code, participantId: participant.id };
      socket.join(code);

      // Tell the joiner the current state (so a late/reconnecting player syncs).
      cb?.({
        ok: true,
        participantId: participant.id,
        rejoinToken: participant.rejoinToken,
        nickname: participant.nickname,
        status: room.status,
        quizTitle: room.quiz.title,
        currentQuestion:
          room.status === 'question' || room.status === 'reveal' ? publicQuestion(room) : null,
        reveal: room.status === 'reveal' ? room.lastReveal : null,
        leaderboard: leaderboard(room),
      });

      // If reconnecting mid-question and they already answered, let them know.
      if (room.status === 'question' && room.answers.has(participant.id)) {
        socket.emit('question:answered_ack', {
          optionIds: room.answers.get(participant.id).optionIds,
        });
      }

      io.to(room.roomCode).emit('room:participants', participantList(room));
    });

    // ---- organizer starts the quiz ----------------------------------------
    socket.on('quiz:start', async (_payload, cb) => {
      const room = getOrganizerRoom(socket);
      if (!room) return cb?.({ error: 'Нет активной сессии' });
      if (room.status !== 'lobby') return cb?.({ error: 'Квиз уже запущен' });
      if (room.participants.size === 0) {
        return cb?.({ error: 'Нет подключённых участников' });
      }
      await prisma.quizSession.update({
        where: { id: room.sessionId },
        data: { status: 'active', startedAt: new Date() },
      });
      showQuestion(io, room, 0);
      cb?.({ ok: true });
    });

    // ---- organizer advances to the next question / finishes ----------------
    socket.on('quiz:next', async (_payload, cb) => {
      const room = getOrganizerRoom(socket);
      if (!room) return cb?.({ error: 'Нет активной сессии' });
      if (room.status !== 'reveal') {
        return cb?.({ error: 'Дождитесь показа ответа перед переходом дальше' });
      }
      const nextIndex = room.currentIndex + 1;
      if (nextIndex >= room.quiz.questions.length) {
        await finishQuiz(io, room);
      } else {
        showQuestion(io, room, nextIndex);
      }
      cb?.({ ok: true });
    });

    // ---- organizer forces reveal (skip remaining time) ---------------------
    socket.on('quiz:reveal', async (_payload, cb) => {
      const room = getOrganizerRoom(socket);
      if (!room) return cb?.({ error: 'Нет активной сессии' });
      if (room.status !== 'question') return cb?.({ error: 'Сейчас нет активного вопроса' });
      await revealQuestion(io, room);
      cb?.({ ok: true });
    });

    // ---- participant submits an answer -------------------------------------
    socket.on('question:answer', async ({ optionIds }, cb) => {
      const room = liveRooms.get(socket.data?.roomCode);
      const participantId = socket.data?.participantId;
      if (!room || !participantId) return cb?.({ error: 'Вы не в комнате' });
      if (room.status !== 'question') {
        return cb?.({ error: 'Сейчас нельзя отвечать' });
      }
      // Server-authoritative timer: reject answers past the deadline.
      if (Date.now() > room.questionEndsAt) {
        return cb?.({ error: 'Время на ответ истекло' });
      }
      const already = room.answers.has(participantId);
      if (already && !room.quiz.allowAnswerChange) {
        return cb?.({ error: 'Изменение ответа запрещено' });
      }

      const selected = Array.isArray(optionIds) ? optionIds : [];
      const q = room.currentQuestion;
      const validIds = new Set(q.options.map((o) => o.id));
      const cleanSelected = selected.filter((id) => validIds.has(id));
      if (cleanSelected.length === 0) return cb?.({ error: 'Выберите вариант ответа' });
      if (q.answerType === 'single' && cleanSelected.length > 1) {
        return cb?.({ error: 'Можно выбрать только один вариант' });
      }

      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const correct = isAnswerCorrect(correctIds, cleanSelected);
      const timeLeftMs = room.questionEndsAt - Date.now();
      const score = computeScore({
        correct,
        speedBonus: room.quiz.speedBonus,
        timeLeftMs,
        timeLimitMs: room.questionTimeLimitMs,
      });

      room.answers.set(participantId, { optionIds: cleanSelected, correct, score });
      cb?.({ ok: true });
      socket.emit('question:answered_ack', { optionIds: cleanSelected });

      // Update organizer with live answer progress.
      io.to(room.organizerSocketId).emit('question:progress', {
        answered: room.answers.size,
        total: [...room.participants.values()].filter((p) => p.connected).length,
      });

      // Auto-reveal once every connected participant has answered — but only
      // when answers are final. If the quiz allows changing answers, we must
      // keep the window open until the timer (or the organizer) ends it.
      if (!room.quiz.allowAnswerChange) {
        const connected = [...room.participants.values()].filter((p) => p.connected);
        if (connected.length > 0 && connected.every((p) => room.answers.has(p.id))) {
          await revealQuestion(io, room);
        }
      }
    });

    // ---- disconnect --------------------------------------------------------
    socket.on('disconnect', () => {
      const { role, roomCode, participantId } = socket.data || {};
      const room = liveRooms.get(roomCode);
      if (!room) return;
      if (role === 'participant' && participantId) {
        const p = room.participants.get(participantId);
        if (p) {
          p.connected = false;
          io.to(room.roomCode).emit('room:participants', participantList(room));
        }
      }
      // Organizer disconnect keeps the room alive so they can reopen it.
    });
  });
}

function getOrganizerRoom(socket) {
  if (socket.data?.role !== 'organizer') return null;
  return liveRooms.get(socket.data.roomCode) || null;
}

// Shows question at `index`, starts the server-side deadline timer.
function showQuestion(io, room, index) {
  if (room.timer) clearTimeout(room.timer);
  const question = room.quiz.questions[index];
  room.status = 'question';
  room.currentIndex = index;
  room.currentQuestion = question;
  room.answers = new Map();
  room.questionTimeLimitMs = questionTimeLimit(room, question);
  room.questionEndsAt = Date.now() + room.questionTimeLimitMs;

  io.to(room.roomCode).emit('question:show', publicQuestion(room));
  io.to(room.organizerSocketId).emit('question:progress', {
    answered: 0,
    total: [...room.participants.values()].filter((p) => p.connected).length,
  });

  // Authoritative deadline: auto-reveal when time is up.
  room.timer = setTimeout(() => {
    revealQuestion(io, room).catch(() => {});
  }, room.questionTimeLimitMs + 200); // small grace for in-flight packets
}

// Persists answers, updates scores, and broadcasts the correct answer + board.
async function revealQuestion(io, room) {
  if (room.status !== 'question') return;
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  room.status = 'reveal';
  const q = room.currentQuestion;
  const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);

  // Persist this question's answers and bump participant scores.
  const writes = [];
  for (const [participantId, ans] of room.answers.entries()) {
    const participant = room.participants.get(participantId);
    if (participant) participant.score += ans.score;
    writes.push(
      prisma.participantAnswer.upsert({
        where: {
          sessionId_questionId_participantId: {
            sessionId: room.sessionId,
            questionId: q.id,
            participantId,
          },
        },
        create: {
          sessionId: room.sessionId,
          questionId: q.id,
          participantId,
          selectedOptionIds: JSON.stringify(ans.optionIds),
          isCorrect: ans.correct,
          scoreAwarded: ans.score,
        },
        update: {
          selectedOptionIds: JSON.stringify(ans.optionIds),
          isCorrect: ans.correct,
          scoreAwarded: ans.score,
        },
      })
    );
  }
  // Persist updated cumulative scores.
  for (const p of room.participants.values()) {
    writes.push(
      prisma.sessionParticipant.update({
        where: { id: p.id },
        data: { score: p.score },
      })
    );
  }
  try {
    await prisma.$transaction(writes);
  } catch {
    // Persistence failures shouldn't break the live flow; results stay in memory.
  }

  const revealPayload = {
    questionId: q.id,
    correctOptionIds: correctIds,
    leaderboard: leaderboard(room),
    isLast: room.currentIndex + 1 >= room.quiz.questions.length,
  };
  room.lastReveal = revealPayload; // cached so mid-reveal reconnects can sync
  io.to(room.roomCode).emit('question:reveal', revealPayload);

  // Tell each participant whether they were right this round.
  for (const [participantId, ans] of room.answers.entries()) {
    const p = room.participants.get(participantId);
    if (p?.connected) {
      io.to(p.socketId).emit('question:result', {
        correct: ans.correct,
        scoreAwarded: ans.score,
        totalScore: p.score,
      });
    }
  }
}

async function finishQuiz(io, room) {
  if (room.timer) clearTimeout(room.timer);
  room.status = 'finished';
  await prisma.quizSession.update({
    where: { id: room.sessionId },
    data: { status: 'finished', finishedAt: new Date() },
  });
  io.to(room.roomCode).emit('quiz:finish', { leaderboard: leaderboard(room) });
  // Keep the room briefly so late reveals/leaderboard fetches resolve, then drop.
  setTimeout(() => liveRooms.delete(room.roomCode), 60_000);
}
