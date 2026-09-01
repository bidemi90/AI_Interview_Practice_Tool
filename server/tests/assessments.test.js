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

function expectedBatchCalls(assessment) {
  return assessment.blueprint.reduce((total, section) => total + Math.ceil(section.questionCount / 3), 0);
}

async function waitForTerminal(assessmentId, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const assessment = await Assessment.findById(assessmentId);
    if (['ready', 'generation_failed'].includes(assessment?.status)) return assessment;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for assessment generation.');
}

async function waitForSectionState(assessmentId, expectedStatus, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const assessment = await Assessment.findById(assessmentId);
    const section = assessment?.generationProgress.sections.find((item) => item.generationStatus === expectedStatus);
    if (section) return { assessment, section };
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for section state: ${expectedStatus}`);
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
    expect(response.body.data.assessment.status).toBe('generating');
    expect(response.body.data.assessment.totalQuestions).toBe(15);
    const stored = await waitForTerminal(response.body.data.assessment.id);
    expect(stored.status).toBe('ready');
    expect(stored.questions).toHaveLength(15);
    expect(stored.generationProgress.completedSections).toBe(stored.generationProgress.totalSections);
    expect(stored.generationProgress.sections.every((section) => section.generationStatus === 'completed')).toBe(true);
  });

  it('marks generation failed after five malformed responses for a section', async () => {
    requestChatCompletion.mockResolvedValue('malformed response');
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    const stored = await waitForTerminal(response.body.data.assessment.id);
    expect(requestChatCompletion).toHaveBeenCalledTimes(5);
    expect(stored.status).toBe('generation_failed');
    expect(stored.questions).toHaveLength(0);
    expect(stored.generationProgress.sections[0].generationStatus).toBe('failed');
    expect(stored.generationProgress.sections[0].attempts).toBe(5);
  });

  it('regenerates a section when duplicate questions are detected', async () => {
    let call = 0;
    requestChatCompletion.mockImplementation(async (messages) => {
      call += 1;
      return call === 1 ? validQuestions(messages, true) : validQuestions(messages);
    });
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    await waitForTerminal(response.body.data.assessment.id);
    expect(requestChatCompletion).toHaveBeenCalledTimes(expectedBatchCalls(response.body.data.assessment) + 1);
  });

  it('recovers a section after one transient provider failure', async () => {
    const transientError = Object.assign(new Error('provider timeout'), { code: 'AI_TIMEOUT', statusCode: 504, isOperational: true });
    requestChatCompletion.mockRejectedValueOnce(transientError).mockImplementation(async (messages) => validQuestions(messages));
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    await waitForTerminal(response.body.data.assessment.id);
    expect(requestChatCompletion).toHaveBeenCalledTimes(expectedBatchCalls(response.body.data.assessment) + 1);
  });

  it('retries only a truncated batch and preserves successful batches', async () => {
    let call = 0;
    const firstBatchResponse = { value: undefined };
    requestChatCompletion.mockImplementation(async (messages) => {
      call += 1;
      if (call === 1) {
        firstBatchResponse.value = validQuestions(messages);
        return firstBatchResponse.value;
      }
      if (call === 2) {
        throw Object.assign(new Error('truncated'), {
          code: 'AI_RESPONSE_TRUNCATED', statusCode: 502, isOperational: true,
          providerMetadata: { finishReason: 'length', responseLength: 200 },
        });
      }
      return validQuestions(messages);
    });
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    await waitForTerminal(response.body.data.assessment.id);
    expect(requestChatCompletion).toHaveBeenCalledTimes(expectedBatchCalls(response.body.data.assessment) + 1);
    expect(requestChatCompletion.mock.results[0].value).toBeDefined();
    const stored = await Assessment.findById(response.body.data.assessment.id);
    expect(stored.questions).toHaveLength(15);
    expect(stored.questions.filter((question) => question.question.includes('unique number 1 for'))).toHaveLength(1);
  });

  it('fails after a truncated batch exhausts five attempts', async () => {
    const truncated = Object.assign(new Error('truncated'), {
      code: 'AI_RESPONSE_TRUNCATED', statusCode: 502, isOperational: true,
      providerMetadata: { finishReason: 'length', responseLength: 200 },
    });
    requestChatCompletion.mockRejectedValue(truncated);
    const response = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    expect(response.status).toBe(201);
    const stored = await waitForTerminal(response.body.data.assessment.id);
    expect(requestChatCompletion).toHaveBeenCalledTimes(5);
    expect(stored.status).toBe('generation_failed');
    expect(stored.questions).toHaveLength(0);
    expect(stored.generationMetadata.finishReason).toBe('length');
    expect(stored.generationMetadata.failedBatch).toBe(1);
  });

  it('never exposes answer-key fields from metadata or public questions', async () => {
    const creation = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    const assessmentId = creation.body.data.assessment.id;
    await waitForTerminal(assessmentId);
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

  it('returns safe section-level status without answer keys', async () => {
    let release;
    requestChatCompletion.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const creation = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    const { section } = await waitForSectionState(creation.body.data.assessment.id, 'generating');
    const response = await authorized(request(app).get(`/api/v1/assessments/${creation.body.data.assessment.id}/status`));
    expect(response.status).toBe(200);
    expect(response.body.data.currentSection).toBe(section.section);
    expect(response.body.data.sections[0]).toMatchObject({ status: 'generating', attempts: 1 });
    expect(JSON.stringify(response.body)).not.toContain('correctAnswer');
    release(validQuestions(requestChatCompletion.mock.calls[0][0]));
    await waitForTerminal(creation.body.data.assessment.id);
  });

  it('persists retrying state and succeeds before attempt five', async () => {
    let release;
    requestChatCompletion
      .mockResolvedValueOnce('malformed response')
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }))
      .mockImplementation(async (messages) => validQuestions(messages));
    const creation = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    const { section } = await waitForSectionState(creation.body.data.assessment.id, 'retrying');
    expect(section.attempts).toBe(2);
    release(validQuestions(requestChatCompletion.mock.calls[1][0]));
    const ready = await waitForTerminal(creation.body.data.assessment.id);
    expect(ready.status).toBe('ready');
    expect(ready.generationProgress.sections[0].attempts).toBe(2);
  });

  it('retries only the failed section and preserves completed section questions', async () => {
    let firstSection;
    requestChatCompletion.mockImplementation(async (messages) => {
      const requirements = requirementsFrom(messages);
      firstSection ||= requirements.section;
      return requirements.section === firstSection ? validQuestions(messages) : 'malformed response';
    });
    const creation = await authorized(request(app).post('/api/v1/assessments')).send({ jobProfileId: jobProfile.id, mode: 'quick' });
    const failedAssessment = await waitForTerminal(creation.body.data.assessment.id);
    expect(failedAssessment.status).toBe('generation_failed');
    const completed = failedAssessment.generationProgress.sections.find((section) => section.generationStatus === 'completed');
    const failed = failedAssessment.generationProgress.sections.find((section) => section.generationStatus === 'failed');
    expect(completed).toBeDefined();
    expect(failed.attempts).toBe(5);
    const preservedIds = failedAssessment.questions.map((question) => question.questionId);
    requestChatCompletion.mockImplementation(async (messages) => validQuestions(messages));
    const retryResponse = await authorized(request(app).post(`/api/v1/assessments/${failedAssessment.id}/sections/${encodeURIComponent(failed.section)}/retry`));
    expect(retryResponse.status).toBe(202);
    expect(retryResponse.body.data.sections.find((section) => section.name === failed.section).attempts).toBe(0);
    const ready = await waitForTerminal(failedAssessment.id);
    expect(ready.status).toBe('ready');
    expect(ready.questions).toHaveLength(15);
    expect(ready.questions.filter((question) => preservedIds.includes(question.questionId))).toHaveLength(preservedIds.length);
    expect(ready.generationProgress.sections.every((section) => section.generationStatus === 'completed')).toBe(true);
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
