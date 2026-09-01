import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { Assessment } from '../src/models/Assessment.js';
import { JobProfile } from '../src/models/JobProfile.js';
import { User } from '../src/models/User.js';
import { UserSectionPerformance } from '../src/models/UserSectionPerformance.js';
import { createAssessmentBlueprint } from '../src/services/assessmentPlanningService.js';
import { applyAssessmentPerformance, rebuildUserSectionPerformance } from '../src/services/userSectionPerformanceService.js';
import { effectiveWeaknessWeight, normalizeSectionName, performanceTrend, proficiencyScore, weaknessWeight } from '../src/utils/sectionPerformance.js';
import { signAccessToken } from '../src/utils/jwt.js';

const analysis = {
  jobTitle: 'Software Developer', technicalSkills: ['Git', 'APIs'], experienceAreas: ['Development'],
  recommendedSections: [
    { name: 'Communication', category: 'general', priority: 'high', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'Teamwork', category: 'general', priority: 'medium', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'Ethics', category: 'general', priority: 'low', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'Git', category: 'job_specific', priority: 'high', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'API Design', category: 'job_specific', priority: 'high', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'Testing', category: 'job_specific', priority: 'medium', suggestedQuestionTypes: ['multiple_choice'] },
    { name: 'Databases', category: 'job_specific', priority: 'low', suggestedQuestionTypes: ['multiple_choice'] },
  ],
};

let mongo;
let user;
let job;
const resultFor = (scores, scoredAt = new Date()) => ({
  totalQuestions: scores.reduce((sum, score) => sum + score.scoredQuestions, 0), scoredQuestions: scores.reduce((sum, score) => sum + score.scoredQuestions, 0),
  correctAnswers: 0, incorrectAnswers: 0, earnedPoints: scores.reduce((sum, score) => sum + score.earnedPoints, 0),
  availablePoints: scores.reduce((sum, score) => sum + score.availablePoints, 0), percentageCorrect: 60,
  overallReadinessScore: 60, readinessBand: 'Developing', sectionScores: scores, strongAreas: [], weakAreas: [],
  questionGradings: [], feedbackStatus: 'failed', scoredAt,
});
const section = (name, earned, available, category = 'job_specific') => ({
  section: name, category, totalQuestions: available, scoredQuestions: available, correctAnswers: earned,
  incorrectAnswers: available - earned, earnedPoints: earned, availablePoints: available, percentage: (earned / available) * 100,
});

async function scoredAssessment(scores, scoredAt = new Date()) {
  return Assessment.create({
    userId: user.id, jobProfileId: job.id, jobSnapshot: { jobTitle: 'Software Developer', sourceType: 'predefined_role' },
    mode: 'standard', status: 'submitted', generationProgress: { totalSections: scores.length, completedSections: scores.length },
    blueprint: scores.map((score) => ({ section: score.section, category: score.category, questionCount: score.totalQuestions, difficultyDistribution: { medium: score.totalQuestions }, questionTypeDistribution: { multiple_choice: score.totalQuestions } })),
    submittedAt: scoredAt, result: resultFor(scores, scoredAt),
  });
}

beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); });
beforeEach(async () => {
  await Promise.all([Assessment.deleteMany({}), JobProfile.deleteMany({}), User.deleteMany({}), UserSectionPerformance.deleteMany({})]);
  user = await User.create({ name: 'Adaptive User', email: 'adaptive@example.com', passwordHash: 'unused' });
  job = await JobProfile.create({ userId: user.id, sourceType: 'predefined_role', predefinedRoleKey: 'software-developer', analysis: { ...analysis, mainResponsibilities: [], requiredSkills: [], softSkills: [], likelyInterviewTopics: [], recommendedSections: analysis.recommendedSections.map((item) => ({ ...item, description: `Assesses ${item.name}.` })) }, analysisVersion: '1', aiMetadata: { provider: 'test', model: 'test', generatedAt: new Date() } });
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

describe('section performance formulas', () => {
  it('normalizes deterministically and clamps transparent weights', () => {
    expect(['Git', 'git', 'GIT'].map(normalizeSectionName)).toEqual(['git', 'git', 'git']);
    expect(normalizeSectionName('API Design')).toBe('api_design');
    expect(proficiencyScore(3, 4)).toBe(75);
    expect([weaknessWeight(100), weaknessWeight(0)]).toEqual([1, 2]);
    expect([effectiveWeaknessWeight(40, 0), effectiveWeaknessWeight(40, 1), effectiveWeaknessWeight(40, 2), effectiveWeaknessWeight(40, 3)]).toEqual([1, 1.15, 1.3, 1.6]);
    expect(performanceTrend([{ percentage: 40 }, { percentage: 50 }])).toBe('improving');
  });
});

describe('aggregation, planning and dashboard', () => {
  it('creates point-weighted records, updates them once, and rebuilds idempotently', async () => {
    const first = await scoredAssessment([section('Git', 2, 5)]);
    await applyAssessmentPerformance(first);
    await applyAssessmentPerformance(first);
    const second = await scoredAssessment([section('git', 4, 5)], new Date(Date.now() + 1000));
    await applyAssessmentPerformance(second);
    let record = await UserSectionPerformance.findOne({ userId: user.id });
    expect(record).toMatchObject({ normalizedSectionKey: 'git', attempts: 2, totalPointsEarned: 6, totalPointsAvailable: 10, averagePercentage: 60, proficiencyScore: 60, weaknessWeight: 1.4, bestPercentage: 80, worstPercentage: 40 });
    await rebuildUserSectionPerformance(user.id);
    await rebuildUserSectionPerformance(user.id);
    record = await UserSectionPerformance.findOne({ userId: user.id });
    expect(record).toMatchObject({ attempts: 2, totalPointsEarned: 6, totalPointsAvailable: 10 });
  });

  it('keeps exact category totals, minimum coverage and deterministic capped adaptation', () => {
    const history = [{ normalizedSectionKey: 'git', proficiencyScore: 20, attempts: 3 }];
    const baseline = createAssessmentBlueprint(analysis, 'standard');
    const adaptive = createAssessmentBlueprint(analysis, 'standard', history);
    expect(adaptive).toEqual(createAssessmentBlueprint(analysis, 'standard', history));
    expect(adaptive.reduce((sum, item) => sum + item.questionCount, 0)).toBe(30);
    expect(adaptive.filter((item) => item.category === 'general').reduce((sum, item) => sum + item.questionCount, 0)).toBe(10);
    expect(adaptive.filter((item) => item.category === 'job_specific').reduce((sum, item) => sum + item.questionCount, 0)).toBe(20);
    expect(adaptive.every((item) => item.questionCount >= 1)).toBe(true);
    expect(Math.max(...adaptive.filter((item) => item.category === 'job_specific').map((item) => item.questionCount))).toBeLessThanOrEqual(7);
    expect(adaptive.find((item) => item.section === 'Git').questionCount).toBeGreaterThanOrEqual(baseline.find((item) => item.section === 'Git').questionCount);
    expect(adaptive.find((item) => item.section === 'Communication').questionCount).toBeGreaterThan(0);
  });

  it('returns safe isolated dashboard analytics', async () => {
    const assessment = await scoredAssessment([section('Git', 2, 5), section('Communication', 4, 5, 'general')]);
    await applyAssessmentPerformance(assessment);
    const token = signAccessToken(user.id);
    const summary = await request(app).get('/api/v1/dashboard/summary').set('Authorization', `Bearer ${token}`);
    const performance = await request(app).get('/api/v1/dashboard/performance').set('Authorization', `Bearer ${token}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({ totalAssessments: 1, completedAssessments: 1, latestScore: 60 });
    expect(performance.body.data.sections).toHaveLength(2);
    expect(JSON.stringify(summary.body)).not.toContain('correctAnswer');
    const other = await User.create({ name: 'Other', email: 'other-adaptive@example.com', passwordHash: 'unused' });
    const isolated = await request(app).get('/api/v1/dashboard/performance').set('Authorization', `Bearer ${signAccessToken(other.id)}`);
    expect(isolated.body.data.sections).toEqual([]);
  });
});
