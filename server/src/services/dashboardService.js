import { Assessment } from '../models/Assessment.js';
import { UserSectionPerformance } from '../models/UserSectionPerformance.js';
import { serializeAssessmentSummary } from '../serializers/assessmentSerializer.js';
import { serializePerformance } from './userSectionPerformanceService.js';

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function dashboardSummary(userId) {
  const [assessments, performance] = await Promise.all([
    Assessment.find({ userId }).sort({ createdAt: -1 }),
    UserSectionPerformance.find({ userId }),
  ]);
  const scored = assessments.filter((item) => item.result?.scoredAt);
  const chronological = [...scored].sort((a, b) => new Date(a.result.scoredAt) - new Date(b.result.scoredAt));
  const scores = scored.map((item) => item.result.percentageCorrect);
  const ranked = [...performance].sort((a, b) => b.proficiencyScore - a.proficiencyScore);
  const readinessDistribution = scored.reduce((result, item) => {
    result[item.result.readinessBand] = (result[item.result.readinessBand] || 0) + 1;
    return result;
  }, {});
  return {
    totalAssessments: assessments.length,
    completedAssessments: assessments.filter((item) => item.status === 'submitted').length,
    averageScore: scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
    bestScore: scores.length ? Math.max(...scores) : null,
    latestScore: chronological.at(-1)?.result.percentageCorrect ?? null,
    latestReadinessBand: chronological.at(-1)?.result.readinessBand ?? null,
    readinessDistribution,
    strongestSections: ranked.slice(0, 3).map(serializePerformance),
    weakestSections: ranked.slice().reverse().slice(0, 3).map(serializePerformance),
    scoreHistory: chronological.map((item) => ({ assessmentId: item.id, date: item.result.scoredAt, score: item.result.percentageCorrect })),
    recentAssessments: assessments.slice(0, 10).map(serializeAssessmentSummary),
  };
}

export async function dashboardPerformance(userId) {
  const records = await UserSectionPerformance.find({ userId }).sort({ proficiencyScore: 1, displayName: 1 });
  return { sections: records.map(serializePerformance) };
}
