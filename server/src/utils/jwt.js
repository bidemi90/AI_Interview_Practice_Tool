import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

function requireJwtSecret() {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is required for authentication.');
  return env.jwtSecret;
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId.toString() }, requireJwtSecret(), { expiresIn: env.jwtExpiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, requireJwtSecret());
}
