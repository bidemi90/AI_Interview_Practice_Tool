import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken } from '../utils/jwt.js';

const HASH_ROUNDS = 12;

export async function registerUser({ name, email, password }) {
  if (await User.exists({ email })) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  try {
    const user = await User.create({ name, email, passwordHash });
    return { user, token: signAccessToken(user.id) };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
    }
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !validPassword) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();
  user.passwordHash = undefined;
  return { user, token: signAccessToken(user.id) };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }
  user.passwordHash = await bcrypt.hash(newPassword, HASH_ROUNDS);
  await user.save();
}
