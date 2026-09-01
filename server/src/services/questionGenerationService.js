import { randomUUID } from 'crypto';
import { env } from '../config/environment.js';
import { requestChatCompletion } from '../integrations/openRouter/openRouterClient.js';
import { buildQuestionGenerationMessages } from '../prompts/questionGenerationPrompt.js';
import { AppError } from '../utils/AppError.js';
import { validateGeneratedQuestions } from './questionValidationService.js';

function sectionDetails(jobAnalysis, blueprintSection) {
  const source = jobAnalysis.recommendedSections.find((section) => section.name === blueprintSection.section);
  return { ...blueprintSection, description: source?.description || `Assessment section for ${blueprintSection.section}` };
}

export async function generateAssessmentQuestions(assessment, jobAnalysis) {
  const questions = [];
  let attempts = 0;
  try {
    for (const blueprintSection of assessment.blueprint) {
      const section = sectionDetails(jobAnalysis, blueprintSection.toObject ? blueprintSection.toObject() : blueprintSection);
      let result;
      let repairContext;
      for (let sectionAttempt = 1; sectionAttempt <= 2; sectionAttempt += 1) {
        attempts += 1;
        try {
          const rawContent = await requestChatCompletion(
            buildQuestionGenerationMessages(jobAnalysis, section, repairContext),
            { maxTokens: Math.min(8_000, Math.max(2_500, section.questionCount * 700)) },
          );
          result = validateGeneratedQuestions(rawContent, section, questions);
          if (result.success) break;
          repairContext = `Validation issue: ${result.reason}. Follow the exact JSON schema and blueprint counts.`;
          console.warn({
            code: 'QUESTION_VALIDATION_RETRY', section: section.section,
            attempt: sectionAttempt, reason: result.reason,
          });
        } catch (providerError) {
          repairContext = `The previous provider attempt failed with the safe error code: ${providerError.code || 'AI_PROVIDER_ERROR'}. Generate a fresh response.`;
          console.warn({
            code: 'QUESTION_PROVIDER_RETRY', section: section.section,
            attempt: sectionAttempt, reason: providerError.code || 'AI_PROVIDER_ERROR',
          });
          if (sectionAttempt === 2) throw providerError;
        }
      }
      if (!result.success) throw new AppError(`Question generation failed for section: ${section.section}.`, 502, 'QUESTION_GENERATION_FAILED');
      questions.push(...result.data.map((question) => ({ ...question, questionId: randomUUID() })));
      assessment.questions = questions;
      assessment.generationProgress.completedSections += 1;
      assessment.generationMetadata.attempts = attempts;
      await assessment.save();
    }
    assessment.status = 'ready';
    assessment.generationMetadata = { provider: 'openrouter', model: env.openRouter.model, generatedAt: new Date(), attempts };
    await assessment.save();
    return assessment;
  } catch (error) {
    assessment.status = 'generation_failed';
    assessment.generationMetadata.attempts = attempts;
    await assessment.save();
    if (error instanceof AppError) throw error;
    throw new AppError('Assessment generation failed. Please try again.', 502, 'QUESTION_GENERATION_FAILED');
  }
}
