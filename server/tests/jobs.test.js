import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/integrations/openRouter/openRouterClient.js', () => ({ requestChatCompletion: vi.fn() }));

import app from '../src/app.js';
import { requestChatCompletion } from '../src/integrations/openRouter/openRouterClient.js';
import { Assessment } from '../src/models/Assessment.js';
import { JobProfile } from '../src/models/JobProfile.js';
import { User } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/jwt.js';

const analysis = {
  jobTitle: 'Frontend Developer',
  mainResponsibilities: ['Build accessible web interfaces'],
  requiredSkills: ['JavaScript', 'React'],
  technicalSkills: ['React', 'CSS'],
  softSkills: ['Communication'],
  experienceAreas: ['API integration'],
  likelyInterviewTopics: ['React state', 'Accessibility'],
  recommendedSections: [
    { name: 'Communication', category: 'general', description: 'Evaluates clear professional communication.', priority: 'medium', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'React', category: 'job_specific', description: 'Evaluates React fundamentals and practical usage.', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'code'] },
  ],
};

let mongoServer;
let user;
let token;

const authorized = (requestBuilder, authorizationToken = token) => requestBuilder.set('Authorization', `Bearer ${authorizationToken}`);

async function createProfile(ownerId = user.id) {
  return JobProfile.create({
    userId: ownerId, sourceType: 'predefined_role', predefinedRoleKey: 'frontend-developer',
    analysis, analysisVersion: '1.0',
    aiMetadata: { provider: 'openrouter', model: 'test-model', generatedAt: new Date() },
  });
}

async function createAssessment(profile, status, options = {}) {
  return Assessment.create({
    userId: options.userId || user.id, jobProfileId: profile.id,
    jobSnapshot: { jobTitle: analysis.jobTitle, sourceType: 'predefined_role' },
    mode: options.mode || 'quick', status,
    generationProgress: { completedSections: 1, totalSections: 1 },
    blueprint: [{ section: 'React', category: 'job_specific', questionCount: 2, difficultyDistribution: { easy: 1, medium: 1 }, questionTypeDistribution: { multiple_choice: 2 } }],
    questions: [], answers: options.answers || [],
    ...(status === 'in_progress' ? { startedAt: new Date() } : {}),
    ...(status === 'submitted' ? { startedAt: new Date(), submittedAt: new Date() } : {}),
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
  });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), JobProfile.deleteMany({}), Assessment.deleteMany({})]);
  user = await User.create({ name: 'Job User', email: 'jobs@example.com', passwordHash: 'unused-test-hash' });
  token = signAccessToken(user.id);
  requestChatCompletion.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('roles and job analysis API', () => {
  it('returns the public predefined role catalog', async () => {
    const response = await request(app).get('/api/v1/roles');
    expect(response.status).toBe(200);
    expect(response.body.data.roles).toHaveLength(10);
    expect(response.body.data.roles[0]).toEqual(expect.objectContaining({ key: expect.any(String), title: expect.any(String), description: expect.any(String) }));
  });

  it('rejects an insufficient job description', async () => {
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({ jobDescription: 'Too short' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects requests containing both sources', async () => {
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({
      jobDescription: 'A sufficiently detailed frontend developer position requiring React, JavaScript, accessibility, testing, teamwork, and API integration experience.',
      predefinedRoleKey: 'frontend-developer',
    });
    expect(response.status).toBe(400);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects requests containing no source', async () => {
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({});
    expect(response.status).toBe(400);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects an invalid predefined role', async () => {
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({ predefinedRoleKey: 'not-a-role' });
    expect(response.status).toBe(400);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('saves a validated structured AI analysis', async () => {
    requestChatCompletion.mockResolvedValue(JSON.stringify(analysis));
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({ predefinedRoleKey: 'frontend-developer' });
    expect(response.status).toBe(201);
    expect(response.body.data.jobProfile.analysis.jobTitle).toBe('Frontend Developer');
    expect(await JobProfile.countDocuments({ userId: user.id })).toBe(1);
    expect(requestChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('retries once and safely rejects repeated malformed AI responses', async () => {
    requestChatCompletion.mockResolvedValueOnce('not json').mockResolvedValueOnce('{"jobTitle":"Missing fields"}');
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({ predefinedRoleKey: 'frontend-developer' });
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('AI_INVALID_RESPONSE');
    expect(requestChatCompletion).toHaveBeenCalledTimes(2);
    expect(await JobProfile.countDocuments()).toBe(0);
  });

  it('recovers when the first provider attempt fails transiently', async () => {
    const transientError = Object.assign(new Error('provider timeout'), { code: 'AI_TIMEOUT', statusCode: 504, isOperational: true });
    requestChatCompletion.mockRejectedValueOnce(transientError).mockResolvedValueOnce(JSON.stringify(analysis));
    const response = await authorized(request(app).post('/api/v1/jobs/analyze')).send({ predefinedRoleKey: 'frontend-developer' });
    expect(response.status).toBe(201);
    expect(requestChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('lists only the authenticated user job profiles', async () => {
    await createProfile();
    const other = await User.create({ name: 'Other User', email: 'other@example.com', passwordHash: 'unused' });
    await createProfile(other.id);
    const response = await authorized(request(app).get('/api/v1/jobs'));
    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.pagination.total).toBe(1);
  });

  it('prevents access to another user job profile', async () => {
    const other = await User.create({ name: 'Other User', email: 'other@example.com', passwordHash: 'unused' });
    const profile = await createProfile(other.id);
    const response = await authorized(request(app).get(`/api/v1/jobs/${profile.id}`));
    expect(response.status).toBe(404);
  });

  it('returns an empty assessment history for a JobProfile with no assessments', async () => {
    const profile = await createProfile();
    const response = await authorized(request(app).get(`/api/v1/jobs/${profile.id}/assessments`));
    expect(response.status).toBe(200);
    expect(response.body.data.assessments).toEqual([]);
  });

  it.each(['ready', 'in_progress', 'submitted', 'generation_failed'])('returns safe %s assessment state for its JobProfile', async (status) => {
    const profile = await createProfile();
    await createAssessment(profile, status, { answers: [{ questionId: 'one', answer: 'A', answeredAt: new Date() }] });
    const response = await authorized(request(app).get(`/api/v1/jobs/${profile.id}/assessments`));
    expect(response.status).toBe(200);
    expect(response.body.data.assessments[0]).toMatchObject({ status, answeredQuestionCount: 1, totalQuestions: 2, progressPercentage: 50 });
    const text = JSON.stringify(response.body);
    for (const field of ['questions', 'answers', 'correctAnswer', 'explanation']) expect(text).not.toContain(field);
  });

  it('returns multiple assessments newest first and keeps submitted history available', async () => {
    const profile = await createProfile();
    const older = await createAssessment(profile, 'submitted', { mode: 'standard' });
    await Assessment.updateOne({ _id: older.id }, { createdAt: new Date('2025-01-01') });
    const newer = await createAssessment(profile, 'in_progress', { mode: 'full' });
    await Assessment.updateOne({ _id: newer.id }, { createdAt: new Date('2025-02-01') });
    const response = await authorized(request(app).get(`/api/v1/jobs/${profile.id}/assessments`));
    expect(response.body.data.assessments.map((item) => item.assessmentId)).toEqual([newer.id, older.id]);
    expect(response.body.data.assessments[1].status).toBe('submitted');
  });

  it('isolates job assessment history and recent assessments by owner', async () => {
    const profile = await createProfile();
    await createAssessment(profile, 'ready');
    const other = await User.create({ name: 'Other User', email: 'assessment-other@example.com', passwordHash: 'unused' });
    const otherProfile = await createProfile(other.id);
    await createAssessment(otherProfile, 'submitted', { userId: other.id });
    const forbidden = await authorized(request(app).get(`/api/v1/jobs/${otherProfile.id}/assessments`));
    expect(forbidden.status).toBe(404);
    const recent = await authorized(request(app).get('/api/v1/assessments/recent'));
    expect(recent.status).toBe(200);
    expect(recent.body.data.assessments).toHaveLength(1);
    expect(recent.body.data.assessments[0].jobProfileId).toBe(profile.id);
  });

  it('deletes an owned job profile', async () => {
    const profile = await createProfile();
    const response = await authorized(request(app).delete(`/api/v1/jobs/${profile.id}`));
    expect(response.status).toBe(200);
    expect(await JobProfile.findById(profile.id)).toBeNull();
  });

  it('rejects unauthenticated job access without calling OpenRouter', async () => {
    const response = await request(app).post('/api/v1/jobs/analyze').send({ predefinedRoleKey: 'frontend-developer' });
    expect(response.status).toBe(401);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });
});
