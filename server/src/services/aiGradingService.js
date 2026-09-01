import { env } from '../config/environment.js';
import { requestChatCompletion } from '../integrations/openRouter/openRouterClient.js';
import { feedbackMessages, shortAnswerGradingMessages } from '../prompts/scoringPrompts.js';
import { feedbackSchema, parseStructuredContent, shortAnswerGradeSchema } from '../validators/scoringSchemas.js';
import { AppError } from '../utils/AppError.js';

async function structuredRequest(buildMessages, input, maxTokens, failureCode) {
  let retryReason;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const raw = await requestChatCompletion(buildMessages(input, retryReason), {
        model: env.openRouter.feedbackModel, maxTokens,
        diagnostics: { operation: failureCode, attempt },
      });
      const schema = failureCode === 'SHORT_ANSWER_GRADING_FAILED' ? shortAnswerGradeSchema : feedbackSchema;
      const parsed = parseStructuredContent(raw, schema);
      if (parsed.success) return parsed.data;
      retryReason = 'invalid structured response';
      lastError = new AppError('AI returned invalid structured output.', 502, failureCode);
    } catch (error) {
      lastError = error;
      retryReason = error.code || 'provider error';
    }
  }
  throw new AppError('AI processing is temporarily unavailable.', 502, failureCode, { causeCode: lastError?.code });
}

export async function gradeShortAnswer(question, userAnswer) {
  const grade = await structuredRequest(shortAnswerGradingMessages, {
    question: question.question, userAnswer, expectedConcepts: question.acceptableAnswers || [],
    section: question.section, maximumPoints: question.points,
  }, 700, 'SHORT_ANSWER_GRADING_FAILED');
  return {
    awardedPoints: Math.min(question.points, Math.max(0, grade.awardedPoints)),
    isAcceptable: grade.isAcceptable,
    reason: grade.reason,
  };
}

export async function generateQualitativeFeedback(input) {
  return structuredRequest(feedbackMessages, input, 1_200, 'FEEDBACK_GENERATION_FAILED');
}
