import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}
