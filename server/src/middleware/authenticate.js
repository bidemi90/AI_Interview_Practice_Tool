import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(request, _response, next) {
  try {
    const [scheme, token] = request.get('authorization')?.split(' ') || [];
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authentication is required.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAccessToken(token);
    if (typeof payload !== 'object' || !payload.sub) {
      throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new AppError('Authenticated user was not found.', 401, 'INVALID_TOKEN');
    request.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
    }
    return next(error);
  }
}
