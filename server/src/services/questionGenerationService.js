import { randomUUID } from 'crypto';
import { env } from '../config/environment.js';
import { requestChatCompletion } from '../integrations/openRouter/openRouterClient.js';
import { buildQuestionGenerationMessages } from '../prompts/questionGenerationPrompt.js';
import { AppError } from '../utils/AppError.js';
import { validateGeneratedQuestions } from './questionValidationService.js';

export const MAX_GENERATION_ATTEMPTS = 5;

function sectionDetails(jobAnalysis, blueprintSection) {
  const source = jobAnalysis.recommendedSections.find((item) => item.name === blueprintSection.section);
  return { ...blueprintSection, description: source?.description || `Assessment section for ${blueprintSection.section}` };
}

function distributionSequence(distribution) {
  const remaining = Object.entries(distribution).map(([name, count]) => ({ name, count }));
  const sequence = [];
  while (remaining.some((item) => item.count > 0)) {
    remaining.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
    const next = remaining.find((item) => item.count > 0);
    sequence.push(next.name);
    next.count -= 1;
  }
  return sequence;
}

function countValues(values) {
  return values.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {});
}

export function createQuestionBatches(section, batchSize = env.openRouter.questionBatchSize) {
  const safeBatchSize = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 3;
  const types = distributionSequence(section.questionTypeDistribution);
  const difficulties = distributionSequence(section.difficultyDistribution);
  const totalBatches = Math.ceil(section.questionCount / safeBatchSize);
  return Array.from({ length: totalBatches }, (_, index) => {
    const start = index * safeBatchSize;
    const end = Math.min(start + safeBatchSize, section.questionCount);
    return {
      ...section, questionCount: end - start,
      questionTypeDistribution: countValues(types.slice(start, end)),
      difficultyDistribution: countValues(difficulties.slice(start, end)),
      batchNumber: index + 1, totalBatches,
    };
  });
}

function safeFailureContext(error, section, batchNumber) {
  const metadata = error.providerMetadata || {};
  return {
    provider: 'openrouter', model: env.openRouter.model,
    actualModel: metadata.actualModel, actualProvider: metadata.provider,
    finishReason: metadata.finishReason, responseLength: metadata.responseLength,
    batchSize: env.openRouter.questionBatchSize, failedSection: section,
    failedBatch: batchNumber, failureCode: error.code || 'QUESTION_GENERATION_FAILED',
  };
}

function validationFeedback(reason, batch) {
  if (reason === 'incorrect_difficulty_distribution') {
    return `The prior response did not match the difficulty distribution. Generate exactly ${JSON.stringify(batch.difficultyDistribution)}.`;
  }
  if (reason === 'incorrect_type_distribution') {
    return `The prior response did not match the question type distribution. Generate exactly ${JSON.stringify(batch.questionTypeDistribution)}.`;
  }
  return `The prior response was rejected because ${reason}. Generate the same batch again using the exact required schema.`;
}

async function generateBatch(jobAnalysis, batch, existingQuestions, hooks) {
  let repairContext;
  let lastError;
  let lastProviderMetadata;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    await hooks.onAttempt(attempt, batch);
    try {
      const rawContent = await requestChatCompletion(
        buildQuestionGenerationMessages(jobAnalysis, batch, repairContext),
        {
          maxTokens: env.openRouter.questionMaxTokens,
          diagnostics: {
            assessmentId: hooks.assessmentId, section: batch.section,
            batchNumber: batch.batchNumber, attempt,
          },
          onMetadata: (metadata) => {
            lastProviderMetadata = metadata;
            console.info({ code: 'QUESTION_GENERATION_RESPONSE', ...metadata });
          },
        },
      );
      const result = validateGeneratedQuestions(rawContent, batch, existingQuestions);
      if (result.success) return result.data;
      lastError = new AppError(`Question generation failed for section: ${batch.section}.`, 502, 'QUESTION_GENERATION_FAILED');
      lastError.providerMetadata = lastProviderMetadata;
      repairContext = validationFeedback(result.reason, batch);
      console.warn({
        code: 'QUESTION_VALIDATION_RETRY', assessmentId: hooks.assessmentId,
        section: batch.section, batchNumber: batch.batchNumber, attempt,
        maxAttempts: MAX_GENERATION_ATTEMPTS, reason: result.reason,
      });
      await hooks.onFailure(attempt, lastError);
    } catch (error) {
      if (error === lastError) {
        if (attempt === MAX_GENERATION_ATTEMPTS) throw error;
        continue;
      }
      lastError = error;
      repairContext = error.code === 'AI_RESPONSE_TRUNCATED'
        ? 'The provider truncated the prior response. Generate a fresh, concise response for this batch only.'
        : `The provider failed with safe code ${error.code || 'AI_PROVIDER_ERROR'}. Generate a fresh response for this batch.`;
      console.warn({
        code: 'QUESTION_PROVIDER_RETRY', assessmentId: hooks.assessmentId,
        section: batch.section, batchNumber: batch.batchNumber, attempt,
        maxAttempts: MAX_GENERATION_ATTEMPTS, reason: error.code || 'AI_PROVIDER_ERROR',
      });
      await hooks.onFailure(attempt, error);
    }
    if (attempt === MAX_GENERATION_ATTEMPTS) throw lastError;
  }
  throw lastError;
}

function progressFor(assessment, sectionName) {
  return assessment.generationProgress.sections.find((item) => item.section === sectionName);
}

async function generateSection(assessment, jobAnalysis, blueprintSection) {
  const section = sectionDetails(jobAnalysis, blueprintSection);
  const progress = progressFor(assessment, section.section);
  const priorQuestions = assessment.questions.filter((question) => question.section !== section.section);
  const sectionQuestions = [];
  assessment.generationProgress.currentSection = section.section;
  progress.generationStatus = 'generating';
  progress.attempts = 0;
  progress.generatedQuestionCount = 0;
  progress.failureCode = undefined;
  await assessment.save();
  let activeBatch = 0;
  try {
    for (const batch of createQuestionBatches(section)) {
      activeBatch = batch.batchNumber;
      const generated = await generateBatch(jobAnalysis, batch, [...priorQuestions, ...sectionQuestions], {
        assessmentId: assessment.id,
        onAttempt: async (attempt) => {
          progress.generationStatus = attempt === 1 ? 'generating' : 'retrying';
          progress.attempts = Math.max(progress.attempts, attempt);
          await assessment.save();
        },
        onFailure: async (attempt, error) => {
          progress.generationStatus = attempt < MAX_GENERATION_ATTEMPTS ? 'retrying' : 'failed';
          progress.attempts = attempt;
          progress.failureCode = error.code || 'QUESTION_GENERATION_FAILED';
          await assessment.save();
        },
      });
      sectionQuestions.push(...generated);
    }
    const merged = validateGeneratedQuestions(JSON.stringify({ questions: sectionQuestions }), section, priorQuestions);
    if (!merged.success) throw new AppError(`Question generation failed for section: ${section.section}.`, 502, 'QUESTION_GENERATION_FAILED');
    assessment.questions = [...priorQuestions, ...merged.data.map((question) => ({ ...question, questionId: randomUUID() }))];
    progress.generationStatus = 'completed';
    progress.generatedQuestionCount = merged.data.length;
    progress.failureCode = undefined;
    assessment.generationProgress.completedSections = assessment.generationProgress.sections.filter((item) => item.generationStatus === 'completed').length;
    await assessment.save();
    return true;
  } catch (error) {
    progress.generationStatus = 'failed';
    progress.failureCode = error.code || 'QUESTION_GENERATION_FAILED';
    assessment.status = 'generation_failed';
    assessment.generationProgress.currentSection = undefined;
    assessment.generationMetadata = {
      ...(assessment.generationMetadata?.toObject?.() || {}),
      ...safeFailureContext(error, section.section, activeBatch),
    };
    await assessment.save();
    return false;
  }
}

export async function generateAssessmentQuestions(assessment, jobAnalysis) {
  assessment.status = 'generating';
  for (const blueprintValue of assessment.blueprint) {
    const blueprintSection = blueprintValue.toObject ? blueprintValue.toObject() : blueprintValue;
    const progress = progressFor(assessment, blueprintSection.section);
    if (progress?.generationStatus === 'completed') continue;
    if (progress?.generationStatus !== 'pending') continue;
    const succeeded = await generateSection(assessment, jobAnalysis, blueprintSection);
    if (!succeeded) return assessment;
  }
  const allCompleted = assessment.generationProgress.sections.every((item) => item.generationStatus === 'completed');
  assessment.status = allCompleted ? 'ready' : 'generation_failed';
  assessment.generationProgress.currentSection = undefined;
  assessment.generationMetadata.generatedAt = allCompleted ? new Date() : undefined;
  await assessment.save();
  return assessment;
}
