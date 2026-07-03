import { verifyAccessToken } from './jwt.js';

// Requires a valid access token; attaches { id, role, nickname } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' });
  }
}

// Restricts a route to specific roles (e.g. requireRole('organizer')).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

// Optional auth: attaches req.user if a valid token is present, else continues.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Ignore invalid token for optional routes.
    }
  }
  next();
}
