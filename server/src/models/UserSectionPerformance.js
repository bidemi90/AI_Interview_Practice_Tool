import mongoose from 'mongoose';

const recentScoreSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  scoredAt: { type: Date, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  normalizedSectionKey: { type: String, required: true },
  displayName: { type: String, required: true },
  category: { type: String, required: true, enum: ['general', 'job_specific'] },
  attempts: { type: Number, default: 0, min: 0 },
  totalQuestionsAnswered: { type: Number, default: 0, min: 0 },
  totalPointsEarned: { type: Number, default: 0, min: 0 },
  totalPointsAvailable: { type: Number, default: 0, min: 0 },
  averagePercentage: { type: Number, default: 0, min: 0, max: 100 },
  proficiencyScore: { type: Number, default: 0, min: 0, max: 100 },
  weaknessWeight: { type: Number, default: 1, min: 1, max: 2 },
  lastAssessmentPercentage: { type: Number, min: 0, max: 100 },
  bestPercentage: { type: Number, min: 0, max: 100 },
  worstPercentage: { type: Number, min: 0, max: 100 },
  recentScores: { type: [recentScoreSchema], default: [] },
  processedAssessmentIds: { type: [mongoose.Schema.Types.ObjectId], default: [], select: false },
}, { timestamps: true });

schema.index({ userId: 1, normalizedSectionKey: 1 }, { unique: true });
export const UserSectionPerformance = mongoose.model('UserSectionPerformance', schema);
