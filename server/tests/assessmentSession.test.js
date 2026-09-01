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

const questions = [
  {
    questionId: 'question-one', section: 'Git', category: 'job_specific', type: 'multiple_choice', difficulty: 'easy',
    question: 'Which command displays the current Git working directory state?',
    options: ['git status', 'git push', 'git clone', 'git init'], correctAnswer: 'git status',
    explanation: 'Git status displays tracked, modified, staged, and untracked files.', points: 1,
  },
  {
    questionId: 'question-two', section: 'Communication', category: 'general', type: 'scenario', difficulty: 'medium',
    question: 'How should you respond when a project requirement is unclear?',
    options: ['Ask focused clarifying questions', 'Ignore it', 'Guess silently', 'Cancel the project'],
    correctAnswer: 'Ask focused clarifying questions', explanation: 'Clarification aligns expectations and reduces avoidable rework.', points: 1,
  },
  {
    questionId: 'question-three', section: 'Problem Solving', category: 'general', type: 'short_answer', difficulty: 'hard',
    question: 'Describe a structured approach to diagnosing an unfamiliar problem.',
    options: [], correctAnswer: 'Gather evidence, form hypotheses, test, and verify.',
    acceptableAnswers: ['Gather evidence', 'Test hypotheses', 'Verify the outcome'],
    explanation: 'A structured evidence-based process reduces assumptions and confirms the resolution.', points: 1,
  },
];

let mongoServer;
let user;
let token;
let jobProfile;
let assessment;

const authorized = (builder, authToken = token) => builder.set('Authorization', `Bearer ${authToken}`);

async function createAssessment(status = 'ready') {
  return Assessment.create({
    userId: user.id, jobProfileId: jobProfile.id,
    jobSnapshot: { jobTitle: 'Software Developer', sourceType: 'predefined_role' },
    mode: 'quick', status,
    generationProgress: { completedSections: 2, totalSections: 2 },
    blueprint: [
      { section: 'Git', category: 'job_specific', questionCount: 1, difficultyDistribution: { easy: 1, medium: 0, hard: 0 }, questionTypeDistribution: { multiple_choice: 1 } },
      { section: 'Communication', category: 'general', questionCount: 2, difficultyDistribution: { easy: 0, medium: 1, hard: 1 }, questionTypeDistribution: { scenario: 1, short_answer: 1 } },
    ],
    questions,
    ...(status === 'in_progress' ? { startedAt: new Date() } : {}),
    ...(status === 'submitted' ? { startedAt: new Date(), submittedAt: new Date() } : {}),
  });
}

async function start(id = assessment.id) {
  return authorized(request(app).post(`/api/v1/assessments/${id}/start`));
}

async function answer(questionId, answerValue, id = assessment.id, authToken = token) {
  return authorized(request(app).put(`/api/v1/assessments/${id}/answers/${questionId}`), authToken).send({ answer: answerValue });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), JobProfile.deleteMany({}), Assessment.deleteMany({})]);
  user = await User.create({ name: 'Session User', email: 'session@example.com', passwordHash: 'unused' });
  token = signAccessToken(user.id);
  jobProfile = await JobProfile.create({
    userId: user.id, sourceType: 'predefined_role', predefinedRoleKey: 'software-developer',
    analysis: {
      jobTitle: 'Software Developer', mainResponsibilities: [], requiredSkills: [], technicalSkills: [], softSkills: [], experienceAreas: [], likelyInterviewTopics: [],
      recommendedSections: [{ name: 'Git', category: 'job_specific', description: 'Git knowledge.', priority: 'high', suggestedQuestionTypes: ['multiple_choice'] }],
    },
    analysisVersion: '1.0', aiMetadata: { provider: 'openrouter', model: 'test-model', generatedAt: new Date() },
  });
  assessment = await createAssessment();
  requestChatCompletion.mockReset();
});

afterAll(async () => {
  expect(requestChatCompletion).not.toHaveBeenCalled();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('assessment session API', () => {
  it('starts a ready assessment', async () => {
    const response = await start();
    expect(response.status).toBe(200);
    expect(response.body.data.session.status).toBe('in_progress');
    expect(response.body.data.session.startedAt).toEqual(expect.any(String));
  });

  it('starts an already in-progress assessment without resetting answers', async () => {
    await start();
    await answer('question-one', 'git status');
    const response = await start();
    expect(response.status).toBe(200);
    expect(response.body.data.session.answers).toHaveLength(1);
    expect(response.body.data.session.answers[0].answer).toBe('git status');
  });

  it('rejects starting a submitted assessment', async () => {
    assessment.status = 'submitted';
    assessment.submittedAt = new Date();
    await assessment.save();
    const response = await start();
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ASSESSMENT_SUBMITTED');
  });

  it('saves a valid multiple-choice answer without grading it', async () => {
    await start();
    const response = await answer('question-one', 'git status');
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('isCorrect');
    const stored = await Assessment.findById(assessment.id);
    expect(stored.answers[0].answer).toBe('git status');
  });

  it('rejects an invalid objective option', async () => {
    await start();
    const response = await answer('question-one', 'not an option');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ANSWER_OPTION');
  });

  it('replaces an existing answer instead of adding another', async () => {
    await start();
    await answer('question-one', 'git status');
    await answer('question-one', 'git push');
    const stored = await Assessment.findById(assessment.id);
    expect(stored.answers).toHaveLength(1);
    expect(stored.answers[0].answer).toBe('git push');
  });

  it('saves a valid short answer', async () => {
    await start();
    const response = await answer('question-three', 'I gather evidence, test hypotheses, and verify the outcome.');
    expect(response.status).toBe(200);
    const stored = await Assessment.findById(assessment.id);
    expect(stored.answers[0].questionId).toBe('question-three');
  });

  it('rejects an empty short answer', async () => {
    await start();
    const response = await answer('question-three', '   ');
    expect(response.status).toBe(400);
  });

  it('prevents cross-user answer submission', async () => {
    await start();
    const other = await User.create({ name: 'Other', email: 'other-session@example.com', passwordHash: 'unused' });
    const response = await answer('question-one', 'git status', assessment.id, signAccessToken(other.id));
    expect(response.status).toBe(404);
  });

  it('prevents saving an answer before start', async () => {
    const response = await answer('question-one', 'git status');
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ASSESSMENT_NOT_IN_PROGRESS');
  });

  it('prevents changing an answer after submission', async () => {
    assessment.status = 'submitted';
    assessment.submittedAt = new Date();
    await assessment.save();
    const response = await answer('question-one', 'git status');
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ASSESSMENT_SUBMITTED');
  });

  it('persists currentQuestionIndex', async () => {
    await start();
    const response = await authorized(request(app).patch(`/api/v1/assessments/${assessment.id}/progress`)).send({ currentQuestionIndex: 2 });
    expect(response.status).toBe(200);
    expect((await Assessment.findById(assessment.id)).currentQuestionIndex).toBe(2);
  });

  it('resumes with saved position and answers', async () => {
    await start();
    await answer('question-one', 'git status');
    await authorized(request(app).patch(`/api/v1/assessments/${assessment.id}/progress`)).send({ currentQuestionIndex: 1 });
    const response = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}`));
    expect(response.body.data.assessment.currentQuestionIndex).toBe(1);
    expect(response.body.data.assessment.answers).toEqual([expect.objectContaining({ questionId: 'question-one', answer: 'git status' })]);
  });

  it('rejects premature submission and reports unanswered questions', async () => {
    await start();
    await answer('question-one', 'git status');
    const response = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/submit`));
    expect(response.status).toBe(409);
    expect(response.body.error.details.unansweredCount).toBe(2);
    expect(response.body.error.details.unansweredIndexes).toEqual([1, 2]);
  });

  it('submits successfully only after every question is answered', async () => {
    await start();
    await answer('question-one', 'git status');
    await answer('question-two', 'Ask focused clarifying questions');
    await answer('question-three', 'Gather evidence and verify the outcome.');
    const response = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/submit`));
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('submitted');
    expect(response.body.data).not.toHaveProperty('score');
  });

  it('rejects double submission', async () => {
    await start();
    await answer('question-one', 'git status');
    await answer('question-two', 'Ask focused clarifying questions');
    await answer('question-three', 'Gather evidence and verify the outcome.');
    await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/submit`));
    const response = await authorized(request(app).post(`/api/v1/assessments/${assessment.id}/submit`));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ASSESSMENT_SUBMITTED');
  });

  it('protects answer keys throughout session and question APIs', async () => {
    const started = await start();
    const sessionText = JSON.stringify(started.body);
    const question = await authorized(request(app).get(`/api/v1/assessments/${assessment.id}/questions/question-one`));
    const questionText = JSON.stringify(question.body);
    for (const field of ['correctAnswer', 'acceptableAnswers', 'explanation']) {
      expect(sessionText).not.toContain(field);
      expect(questionText).not.toContain(field);
    }
  });

  it('rejects unauthenticated session access', async () => {
    const response = await request(app).post(`/api/v1/assessments/${assessment.id}/start`);
    expect(response.status).toBe(401);
  });
});
