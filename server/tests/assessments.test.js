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
  jobTitle: 'Software Developer',
  mainResponsibilities: ['Build reliable software'], requiredSkills: ['JavaScript', 'Communication'],
  technicalSkills: ['JavaScript', 'Git'], softSkills: ['Communication'], experienceAreas: ['Software development'],
  likelyInterviewTopics: ['JavaScript', 'Git'],
  recommendedSections: [
    { name: 'Communication', category: 'general', description: 'Professional communication.', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'Teamwork', category: 'general', description: 'Effective team collaboration.', priority: 'medium', suggestedQuestionTypes: ['multiple_choice', 'scenario'] },
    { name: 'Programming', category: 'job_specific', description: 'Programming fundamentals.', priority: 'high', suggestedQuestionTypes: ['multiple_choice', 'code', 'code_correction'] },
    { name: 'Git', category: 'job_specific', description: 'Version control workflows.', priority: 'medium', suggestedQuestionTypes: ['multiple_choice', 'scenario', 'code'] },
  ],
};

let mongoServer;
let user;
let token;
let jobProfile;
let questionCounter;

function requirementsFrom(messages) {
  const content = messages[1].content;
  const line = content.split('Generation requirements JSON:\n')[1].split('\n')[0];
  return JSON.parse(line);
}

function validQuestions(messages, duplicate = false) {
  const requirements = requirementsFrom(messages);
  const types = Object.entries(requirements.questionTypeDistribution).flatMap(([type, count]) => Array(count).fill(type));
  const difficulties = Object.entries(requirements.difficultyDistribution).flatMap(([difficulty, count]) => Array(count).fill(difficulty));
  const questions = types.map((type, index) => {
    questionCounter += 1;
    const suffix = duplicate ? 'duplicate wording' : `unique number ${questionCounter}`;
    const objective = type !== 'short_answer';
    return {
      section: requirements.section, category: requirements.category, type,
      difficulty: difficulties[index],
      question: `${requirements.section} assessment question with ${suffix} for interview preparation?`,
      options: objective ? [`Correct ${questionCounter}`, `Distractor A ${questionCounter}`, `Distractor B ${questionCounter}`, `Distractor C ${questionCounter}`] : [],
      ...(type === 'code' || type === 'code_correction' ? { codeSnippet: `const value${questionCounter} = 1;` } : {}),
      correctAnswer: objective ? `Correct ${questionCounter}` : `Expected concept ${questionCounter}`,
      ...(type === 'short_answer' ? { acceptableAnswers: [`Expected concept ${questionCounter}`] } : {}),
      explanation: 'This explanation clearly justifies why the expected answer is correct.',
      points: 1,
    };
  });
  return JSON.stringify({ questions });
}

const authorized = (builder, authToken = token) => builder.set('Authorization', `Bearer ${authToken}`);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), JobProfile.deleteMany({}), Assessment.deleteMany({})]);
  user = await User.create({ name: 'Assessment User', email: 'assessment@example.com', passwordHash: 'unused' });
  token = signAccessToken(user.id);
  jobProfile = await JobProfile.create({
    userId: user.id, sourceType: 'predefined_role', predefinedRoleKey: 'software-developer', analysis,
    analysisVersion: '1.0', aiMetadata: { provider: 'openrouter', model: 'test-model', generatedAt: new Date() },
  });
  questionCounter = 0;
  requestChatCompletion.mockReset();
  requestChatCompletion.mockImplementation(async (messages) => validQuestions(messages));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('assessment generation API', () => {
  it('rejects a JobProfile owned by another user', async () => {
    const other = await User.create({ name: 'Other', email: 'other-assessment@example.com', passwordHash: 'unused' });
    const response = await authorized(request(app).post('/api/v1/assessments'), signAccessToken(other.id)).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(404);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects an invalid assessment mode', async () => {
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'extreme' });
    expect(response.status).toBe(400);
    expect(requestChatCompletion).not.toHaveBeenCalled();
  });

  it('creates a complete ready assessment section-by-section', async () => {
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    expect(response.body.data.assessment.status).toBe('ready');
    expect(response.body.data.assessment.totalQuestions).toBe(15);
    const stored = await Assessment.findById(response.body.data.assessment.id);
    expect(stored.questions).toHaveLength(15);
    expect(stored.generationProgress.completedSections).toBe(stored.generationProgress.totalSections);
  });

  it('marks generation failed after two malformed responses for a section', async () => {
    requestChatCompletion.mockResolvedValue('malformed response');
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(502);
    expect(requestChatCompletion).toHaveBeenCalledTimes(2);
    const stored = await Assessment.findOne({ userId: user.id });
    expect(stored.status).toBe('generation_failed');
    expect(stored.questions).toHaveLength(0);
  });

  it('regenerates a section when duplicate questions are detected', async () => {
    let call = 0;
    requestChatCompletion.mockImplementation(async (messages) => {
      call += 1;
      return call === 1 ? validQuestions(messages, true) : validQuestions(messages);
    });
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    expect(requestChatCompletion).toHaveBeenCalledTimes(response.body.data.assessment.blueprint.length + 1);
  });

  it('recovers a section after one transient provider failure', async () => {
    const transientError = Object.assign(new Error('provider timeout'), { code: 'AI_TIMEOUT', statusCode: 504, isOperational: true });
    requestChatCompletion.mockRejectedValueOnce(transientError).mockImplementation(async (messages) => validQuestions(messages));
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    expect(requestChatCompletion).toHaveBeenCalledTimes(response.body.data.assessment.blueprint.length + 1);
  });

  it('never exposes answer-key fields from metadata or public questions', async () => {
    const creation = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    const assessmentId = creation.body.data.assessment.id;
    const metadata = await authorized(request(app).get(`/api/v1/assessments/${assessmentId}`));
    const publicQuestions = await authorized(request(app).get(`/api/v1/assessments/${assessmentId}/questions`));
    expect(metadata.body.data.assessment).not.toHaveProperty('questions');
    expect(publicQuestions.body.data.questions).toHaveLength(15);
    for (const question of publicQuestions.body.data.questions) {
      expect(question).not.toHaveProperty('correctAnswer');
      expect(question).not.toHaveProperty('acceptableAnswers');
      expect(question).not.toHaveProperty('explanation');
    }
  });

  it('rejects unauthenticated assessment access', async () => {
    const response = await request(app).get(`/api/v1/assessments/${new mongoose.Types.ObjectId()}`);
    expect(response.status).toBe(401);
  });

  it('prevents cross-user assessment access', async () => {
    const assessment = await Assessment.create({
      userId: user.id, jobProfileId: jobProfile.id,
      jobSnapshot: { jobTitle: analysis.jobTitle, sourceType: 'predefined_role' },
      mode: 'quick', status: 'generating', generationProgress: { completedSections: 0, totalSections: 1 },
      blueprint: [{ section: 'Communication', category: 'general', questionCount: 15, difficultyDistribution: { easy: 6, medium: 8, hard: 1 }, questionTypeDistribution: { multiple_choice: 10, scenario: 5 } }],
    });
    const other = await User.create({ name: 'Other', email: 'other-access@example.com', passwordHash: 'unused' });
    const response = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}`), signAccessToken(other.id));
    expect(response.status).toBe(404);
  });
});
