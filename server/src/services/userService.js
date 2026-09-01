import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function updateUserProfile(userId, updates) {
  const fields = {};
  if (Object.hasOwn(updates, 'name')) fields.name = updates.name;
  if (Object.hasOwn(updates, 'targetRoles')) fields.targetRoles = [...new Set(updates.targetRoles)];
  for (const key of ['experienceLevel', 'yearsOfExperience', 'preferredJobTitle']) {
    if (Object.hasOwn(updates, key)) fields[`profile.${key}`] = updates[key];
  }

  const user = await User.findByIdAndUpdate(userId, { $set: fields }, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  return user;
}
