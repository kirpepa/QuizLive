import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/jwt.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  nickname: u.nickname,
});

function issueTokens(user) {
  const payload = { id: user.id, role: user.role, nickname: user.nickname };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, nickname, role } = req.body || {};
  if (!email || !password || !nickname) {
    return res.status(400).json({ error: 'Email, пароль и никнейм обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }
  const normalizedRole = role === 'organizer' ? 'organizer' : 'participant';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, nickname, role: normalizedRole },
  });

  const tokens = issueTokens(user);
  res.status(201).json({ user: publicUser(user), ...tokens });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const tokens = issueTokens(user);
  res.json({ user: publicUser(user), ...tokens });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    const tokens = issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  } catch {
    res.status(401).json({ error: 'Недействительный refresh-токен' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: publicUser(user) });
});

export default router;
