import { Assessment } from '../models/Assessment.js';
import { UserSectionPerformance } from '../models/UserSectionPerformance.js';
import { normalizeSectionName, performanceTrend, proficiencyScore, weaknessWeight } from '../utils/sectionPerformance.js';

export async function applyAssessmentPerformance(assessment) {
  if (!assessment.result?.scoredAt) return;
  for (const score of assessment.result.sectionScores.filter((item) => item.scoredQuestions > 0)) {
    const key = normalizeSectionName(score.section);
    let record = await UserSectionPerformance.findOne({ userId: assessment.userId, normalizedSectionKey: key }).select('+processedAssessmentIds');
    if (!record) record = new UserSectionPerformance({ userId: assessment.userId, normalizedSectionKey: key, displayName: score.section, category: score.category });
    if (record.processedAssessmentIds.some((id) => id.equals(assessment._id))) continue;
    record.displayName = score.section;
    record.category = score.category;
    record.attempts += 1;
    record.totalQuestionsAnswered += score.scoredQuestions;
    record.totalPointsEarned += score.earnedPoints;
    record.totalPointsAvailable += score.availablePoints;
    record.averagePercentage = proficiencyScore(record.totalPointsEarned, record.totalPointsAvailable);
    record.proficiencyScore = record.averagePercentage;
    record.weaknessWeight = weaknessWeight(record.proficiencyScore);
    record.lastAssessmentPercentage = score.percentage;
    record.bestPercentage = record.bestPercentage == null ? score.percentage : Math.max(record.bestPercentage, score.percentage);
    record.worstPercentage = record.worstPercentage == null ? score.percentage : Math.min(record.worstPercentage, score.percentage);
    record.recentScores.push({ assessmentId: assessment._id, percentage: score.percentage, scoredAt: assessment.result.scoredAt });
    record.recentScores = record.recentScores.slice(-10);
    record.processedAssessmentIds.push(assessment._id);
    await record.save();
  }
}

export async function rebuildUserSectionPerformance(userId) {
  await UserSectionPerformance.deleteMany({ userId });
  const assessments = await Assessment.find({ userId, 'result.scoredAt': { $exists: true } }).sort({ 'result.scoredAt': 1 });
  for (const assessment of assessments) await applyAssessmentPerformance(assessment);
  return { userId: String(userId), assessmentsProcessed: assessments.length };
}

export function serializePerformance(record) {
  return {
    section: record.displayName, normalizedSectionKey: record.normalizedSectionKey, category: record.category,
    attempts: record.attempts, averagePercentage: record.averagePercentage, proficiencyScore: record.proficiencyScore,
    weaknessWeight: record.weaknessWeight, latestPercentage: record.lastAssessmentPercentage,
    bestPercentage: record.bestPercentage, trend: performanceTrend(record.recentScores),
  };
}
