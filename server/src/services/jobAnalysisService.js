import { env } from '../config/environment.js';
import { predefinedRoleMap } from '../config/predefinedRoles.js';
import { requestChatCompletion } from '../integrations/openRouter/openRouterClient.js';
import { parseJobAnalysis } from '../integrations/openRouter/responseParser.js';
import { JobProfile } from '../models/JobProfile.js';
import { buildJobAnalysisMessages, buildRepairMessages } from '../prompts/jobAnalysisPrompt.js';
import { AppError } from '../utils/AppError.js';

function createReference(input) {
  if (input.jobDescription) return { sourceType: 'job_description', jobDescription: input.jobDescription };
  const role = predefinedRoleMap.get(input.predefinedRoleKey);
  return { sourceType: 'predefined_role', role: {
    title: role.title, description: role.description,
    responsibilities: role.responsibilities, skills: role.skills,
  } };
}

export async function analyzeAndSaveJob(userId, input) {
  const reference = createReference(input);
  let result;
  let previousInvalidResponse;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const messages = previousInvalidResponse
        ? buildRepairMessages(reference, previousInvalidResponse)
        : buildJobAnalysisMessages(reference);
      const rawResponse = await requestChatCompletion(messages, { maxTokens: 4_000 });
      result = parseJobAnalysis(rawResponse);
      if (result.success) break;
      previousInvalidResponse = rawResponse;
      console.warn({ code: 'JOB_ANALYSIS_VALIDATION_RETRY', attempt, reason: 'invalid_structured_response' });
    } catch (providerError) {
      console.warn({ code: 'JOB_ANALYSIS_PROVIDER_RETRY', attempt, reason: providerError.code || 'AI_PROVIDER_ERROR' });
      if (attempt === 2) throw providerError;
    }
  }
  if (!result?.success) {
    throw new AppError('AI analysis could not produce a valid result. Please try again.', 502, 'AI_INVALID_RESPONSE');
  }
  return JobProfile.create({
    userId, sourceType: reference.sourceType,
    predefinedRoleKey: input.predefinedRoleKey,
    originalJobDescription: input.jobDescription,
    analysis: result.data, analysisVersion: '1.0',
    aiMetadata: { provider: 'openrouter', model: env.openRouter.model, generatedAt: new Date() },
  });
}
