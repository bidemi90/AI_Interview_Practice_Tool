import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { Assessment } from '../models/Assessment.js';
import { rebuildUserSectionPerformance } from '../services/userSectionPerformanceService.js';

await connectDatabase();
const userIds = await Assessment.distinct('userId', { 'result.scoredAt': { $exists: true } });
for (const userId of userIds) {
  const result = await rebuildUserSectionPerformance(userId);
  console.log({ code: 'PERFORMANCE_REBUILT', ...result });
}
await mongoose.disconnect();
