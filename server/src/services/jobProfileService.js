import mongoose from 'mongoose';
import { JobProfile } from '../models/JobProfile.js';
import { AppError } from '../utils/AppError.js';

function ensureValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
}

export async function listJobProfiles(userId, { page, limit }) {
  const filter = { userId };
  const [items, total] = await Promise.all([
    JobProfile.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    JobProfile.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getOwnedJobProfile(userId, id) {
  ensureValidId(id);
  const profile = await JobProfile.findOne({ _id: id, userId });
  if (!profile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  return profile;
}

export async function deleteOwnedJobProfile(userId, id) {
  ensureValidId(id);
  const profile = await JobProfile.findOneAndDelete({ _id: id, userId });
  if (!profile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
}
