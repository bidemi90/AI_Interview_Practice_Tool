import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/integrations/openRouter/openRouterClient.js', () => ({ requestChatCompletion: vi.fn() }));

import app from '../src/app.js';
import { readinessBand } from '../src/config/scoringRules.js';
import { requestChatCompletion } from '../src/integrations/openRouter/openRouterClient.js';
import { Assessment } from '../src/models/Assessment.js';
import { JobProfile } from '../src/models/JobProfile.js';
import { User } from '../src/models/User.js';
import { calculateResultSnapshot } from '../src/services/scoringService.js';
import { signAccessToken } from '../src/utils/jwt.js';

const questions = [
  { questionId: 'q1', section: 'Git', category: 'job_specific', type: 'multiple_choice', difficulty: 'easy', question: 'Which command shows status?', options: ['git status', 'git push', 'git clone', 'git init'], correctAnswer: 'git status', explanation: 'git status displays working tree state.', points: 2 },
  { questionId: 'q2', section: 'Git', category: 'job_specific', type: 'scenario', difficulty: 'medium', question: 'How should a conflict be handled?', options: ['Resolve carefully', 'Delete history', 'Ignore it', 'Force push'], correctAnswer: 'Resolve carefully', explanation: 'Conflicts should be reviewed and resolved carefully.', points: 1 },
  { questionId: 'q3', section: 'APIs', category: 'job_specific', type: 'code', difficulty: 'medium', question: 'Which response code means success?', options: ['200', '404', '500', '301'], codeSnippet: 'return response.status;', correctAnswer: '200', explanation: 'HTTP 200 indicates a successful response.', points: 3 },
];

const feedback = { summary: 'You demonstrated a useful foundation across the assessed interview topics.', strengths: ['Strong command of successful sections.'], weaknesses: ['Review lower-performing sections.'], topicsToRevise: ['Version control workflows'], recommendedNextSteps: ['Practise targeted scenario questions.'] };
const plainAssessment = (answers) => ({ questions, answers });
let mongoServer;
let user;
let token;
let jobProfile;

async function createAssessment(status = 'submitted', overrides = {}) {
  const selectedQuestions = overrides.questions || questions;
  const answers = overrides.answers || selectedQuestions.map((item) => ({ questionId: item.questionId, answer: item.correctAnswer, answeredAt: new Date() }));
  return Assessment.create({
    userId: overrides.userId || user.id, jobProfileId: overrides.jobProfileId || jobProfile.id,
    jobSnapshot: { jobTitle: 'Software Developer', sourceType: 'predefined_role' }, mode: 'standard', status,
    generationProgress: { completedSections: 1, totalSections: 1 },
    blueprint: [{ section: 'Git', category: 'job_specific', questionCount: selectedQuestions.length, difficultyDistribution: { easy: 1 }, questionTypeDistribution: { multiple_choice: selectedQuestions.length } }],
    questions: selectedQuestions, answers, startedAt: new Date(), ...(status === 'submitted' ? { submittedAt: new Date() } : {}),
  });
}

const authorized = (builder, authToken = token) => builder.set('Authorization', `Bearer ${authToken}`);

beforeAll(async () => { mongoServer = await MongoMemoryServer.create(); await mongoose.connect(mongoServer.getUri()); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), JobProfile.deleteMany({}), Assessment.deleteMany({})]);
  user = await User.create({ name: 'Score User', email: 'score@example.com', passwordHash: 'unused' });
  token = signAccessToken(user.id);
  jobProfile = await JobProfile.create({ userId: user.id, sourceType: 'predefined_role', predefinedRoleKey: 'software-developer', analysis: { jobTitle: 'Software Developer', mainResponsibilities: [], requiredSkills: [], technicalSkills: [], softSkills: [], experienceAreas: [], likelyInterviewTopics: [], recommendedSections: [] }, analysisVersion: '1.0', aiMetadata: { provider: 'openrouter', model: 'test', generatedAt: new Date() } });
  requestChatCompletion.mockReset();
  requestChatCompletion.mockResolvedValue(JSON.stringify(feedback));
});
afterAll(async () => { await mongoose.disconnect(); if (mongoServer) await mongoServer.stop(); });

describe('deterministic scoring rules', () => {
  it('calculates a perfect objective score with points and sections', () => {
    const result = calculateResultSnapshot(plainAssessment(questions.map((item) => ({ questionId: item.questionId, answer: item.correctAnswer }))));
    expect(result).toMatchObject({ earnedPoints: 6, availablePoints: 6, percentageCorrect: 100, correctAnswers: 3, incorrectAnswers: 0, overallReadinessScore: 100, readinessBand: 'Excellent' });
    expect(result.sectionScores).toEqual(expect.arrayContaining([expect.objectContaining({ section: 'Git', percentage: 100 }), expect.objectContaining({ section: 'APIs', percentage: 100 })]));
  });

  it('calculates zero and mixed point-weighted scores', () => {
    const zero = calculateResultSnapshot(plainAssessment(questions.map((item) => ({ questionId: item.questionId, answer: item.options[1] }))));
    expect(zero).toMatchObject({ earnedPoints: 0, percentageCorrect: 0, correctAnswers: 0, incorrectAnswers: 3 });
    const mixed = calculateResultSnapshot(plainAssessment([{ questionId: 'q1', answer: 'git status' }, { questionId: 'q2', answer: 'Ignore it' }, { questionId: 'q3', answer: '404' }]));
    expect(mixed).toMatchObject({ earnedPoints: 2, availablePoints: 6, percentageCorrect: 33.33, readinessBand: 'Needs Improvement' });
    expect(mixed.strongAreas).toEqual([]);
    expect(mixed.weakAreas).toEqual(['APIs']);
    expect(mixed.sectionScores.find((item) => item.section === 'Git').percentage).toBe(66.67);
  });

  it('maps readiness band boundaries transparently', () => {
    expect([59.99, 60, 70, 80, 90].map(readinessBand)).toEqual(['Needs Improvement', 'Developing', 'Good', 'Strong', 'Excellent']);
  });
});

describe('scoring and results API', () => {
  it('scores only submitted assessments and rejects cross-user scoring', async () => {
    const active = await createAssessment('in_progress');
    expect((await authorized(request(app).post(`/api/v1/assessments/${active.id}/score`))).status).toBe(409);
    const submitted = await createAssessment();
    const other = await User.create({ name: 'Other', email: 'score-other@example.com', passwordHash: 'unused' });
    expect((await authorized(request(app).post(`/api/v1/assessments/${submitted.id}/score`), signAccessToken(other.id))).status).toBe(404);
  });

  it('scores idempotently and returns a safe result without answer keys', async () => {
    const assessment = await createAssessment();
    const first = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    const second = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    expect(first.status).toBe(200);
    expect(second.body.data.result.scoredAt).toBe(first.body.data.result.scoredAt);
    expect(requestChatCompletion).toHaveBeenCalledTimes(1);
    expect(first.body.data.result).not.toHaveProperty('questionGradings');
    expect(first.body.data.result).not.toHaveProperty('answers');
    const history = await authorized(request(app).get(`/api/v1/jobs/${jobProfile.id}/assessments`));
    expect(history.body.data.assessments[0]).toMatchObject({ hasResult: true, scoredAt: first.body.data.result.scoredAt });
  });

  it('keeps detailed review unavailable before scoring and reveals keys only after scoring', async () => {
    const assessment = await createAssessment();
    const before = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}/results/questions`));
    expect(before.status).toBe(409);
    const during = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}/questions/q1`));
    expect(JSON.stringify(during.body)).not.toContain('correctAnswer');
    await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    const after = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}/results/questions`));
    expect(after.status).toBe(200);
    expect(after.body.data.questions[0]).toMatchObject({ correctAnswer: 'git status', isCorrect: true, explanation: expect.any(String) });
  });

  it('preserves numeric scoring when feedback fails and retries feedback without changing score', async () => {
    requestChatCompletion.mockRejectedValue(new Error('provider unavailable'));
    const assessment = await createAssessment();
    const scored = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    expect(scored.body.data.result).toMatchObject({ percentageCorrect: 100, feedbackStatus: 'failed' });
    const scoredAt = scored.body.data.result.scoredAt;
    requestChatCompletion.mockReset();
    requestChatCompletion.mockResolvedValue(JSON.stringify(feedback));
    const retried = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/results/feedback/retry`));
    expect(retried.body.data.result).toMatchObject({ percentageCorrect: 100, feedbackStatus: 'completed', scoredAt });
  });

  it('validates and clamps isolated short-answer grading', async () => {
    const shortQuestion = { questionId: 'short', section: 'Communication', category: 'general', type: 'short_answer', difficulty: 'medium', question: 'Explain how you clarify requirements.', options: [], correctAnswer: 'Ask focused questions.', acceptableAnswers: ['Ask focused questions'], explanation: 'Clarification aligns expectations.', points: 1 };
    requestChatCompletion.mockImplementation(async (messages) => messages[0].content.startsWith('Grade one')
      ? JSON.stringify({ awardedPoints: 5, maxPoints: 1, isAcceptable: true, reason: 'The response covers the expected clarification concept.' })
      : JSON.stringify(feedback));
    const assessment = await createAssessment('submitted', { questions: [shortQuestion], answers: [{ questionId: 'short', answer: 'I ask focused questions.', answeredAt: new Date() }] });
    const response = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    expect(response.body.data.result).toMatchObject({ earnedPoints: 1, availablePoints: 1, percentageCorrect: 100 });
    expect(requestChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('marks failed short-answer grading without inventing points', async () => {
    const shortQuestion = { questionId: 'short-failed', section: 'Communication', category: 'general', type: 'short_answer', difficulty: 'medium', question: 'Explain how you clarify requirements.', options: [], correctAnswer: 'Ask focused questions.', acceptableAnswers: ['Ask focused questions'], explanation: 'Clarification aligns expectations.', points: 2 };
    requestChatCompletion.mockImplementation(async (messages) => {
      if (messages[0].content.startsWith('Grade one')) throw new Error('grading unavailable');
      return JSON.stringify(feedback);
    });
    const assessment = await createAssessment('submitted', { questions: [shortQuestion], answers: [{ questionId: 'short-failed', answer: 'My detailed response.', answeredAt: new Date() }] });
    const scored = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/score`));
    expect(scored.body.data.result).toMatchObject({ totalQuestions: 1, scoredQuestions: 0, earnedPoints: 0, availablePoints: 0 });
    const review = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}/results/questions`));
    expect(review.body.data.questions[0]).toMatchObject({ gradingStatus: 'grading_failed', pointsAvailable: 2 });
    expect(review.body.data.questions[0].pointsAwarded).toBeUndefined();
  });
});
