import mongoose from 'mongoose';
import { Assessment } from '../models/Assessment.js';
import { JobProfile } from '../models/JobProfile.js';
import { serializeAssessmentMetadata, serializeAssessmentSession, serializeAssessmentSummary, serializeGenerationProgress, serializePublicQuestion } from '../serializers/assessmentSerializer.js';
import { AppError } from '../utils/AppError.js';
import { createAssessmentBlueprint } from './assessmentPlanningService.js';
import { generateAssessmentQuestions } from './questionGenerationService.js';
import { UserSectionPerformance } from '../models/UserSectionPerformance.js';
import { publicBlueprintPreview } from './assessmentPlanningService.js';

function ensureValidId(id, resourceName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`${resourceName} not found.`, 404, `${resourceName.toUpperCase().replace(' ', '_')}_NOT_FOUND`);
}

export async function createAssessment(userId, { jobProfileId, mode }) {
  ensureValidId(jobProfileId, 'Job profile');
  const jobProfile = await JobProfile.findOne({ _id: jobProfileId, userId });
  if (!jobProfile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  const performance = await UserSectionPerformance.find({ userId });
  const blueprint = createAssessmentBlueprint(jobProfile.analysis, mode, performance);
  if (!blueprint.length) throw new AppError('The job analysis has no usable assessment sections.', 422, 'NO_ASSESSMENT_SECTIONS');

  const assessment = await Assessment.create({
    userId,
    jobProfileId: jobProfile.id,
    jobSnapshot: {
      jobTitle: jobProfile.analysis.jobTitle,
      sourceType: jobProfile.sourceType,
      jobDescription: jobProfile.originalJobDescription,
    },
    mode,
    status: 'generating',
    generationProgress: {
      completedSections: 0,
      totalSections: blueprint.length,
      sections: blueprint.map((section) => ({
        section: section.section, category: section.category, questionCount: section.questionCount,
        generationStatus: 'pending', attempts: 0, generatedQuestionCount: 0,
      })),
    },
    blueprint,
    generationMetadata: { provider: 'openrouter', attempts: 0 },
  });
  const response = serializeAssessmentMetadata(assessment);
  void generateAssessmentQuestions(assessment, jobProfile.analysis).catch((error) => {
    console.error({ code: 'ASSESSMENT_BACKGROUND_GENERATION_FAILED', assessmentId: assessment.id, reason: error.code || 'UNEXPECTED_ERROR', message: error.message });
  });
  return response;
}

export async function previewAssessmentPlan(userId, jobProfileId, mode) {
  ensureValidId(jobProfileId, 'Job profile');
  const jobProfile = await JobProfile.findOne({ _id: jobProfileId, userId });
  if (!jobProfile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  const performance = await UserSectionPerformance.find({ userId });
  return publicBlueprintPreview(createAssessmentBlueprint(jobProfile.analysis, mode, performance), mode);
}

export async function getOwnedAssessment(userId, assessmentId) {
  ensureValidId(assessmentId, 'Assessment');
  const assessment = await Assessment.findOne({ _id: assessmentId, userId });
  if (!assessment) throw new AppError('Assessment not found.', 404, 'ASSESSMENT_NOT_FOUND');
  return assessment;
}

export async function getAssessmentMetadata(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  return ['in_progress', 'submitted'].includes(assessment.status)
    ? serializeAssessmentSession(assessment)
    : serializeAssessmentMetadata(assessment);
}

export async function getAssessmentStatus(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  return serializeGenerationProgress(assessment);
}

export async function listAssessmentsForJob(userId, jobProfileId) {
  ensureValidId(jobProfileId, 'Job profile');
  const jobProfile = await JobProfile.findOne({ _id: jobProfileId, userId }).select('_id');
  if (!jobProfile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  const assessments = await Assessment.find({ userId, jobProfileId }).sort({ createdAt: -1 });
  return assessments.map(serializeAssessmentSummary);
}

export async function listRecentAssessments(userId, limit = 10) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 25) : 10;
  const assessments = await Assessment.find({ userId }).sort({ createdAt: -1 }).limit(safeLimit);
  return assessments.map(serializeAssessmentSummary);
}

export async function retryFailedSection(userId, assessmentId, sectionName) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (assessment.status !== 'generation_failed') throw new AppError('Assessment has no failed generation to retry.', 409, 'ASSESSMENT_NOT_FAILED');
  const progress = assessment.generationProgress.sections.find((item) => item.section === sectionName);
  if (!progress) throw new AppError('Assessment section not found.', 404, 'ASSESSMENT_SECTION_NOT_FOUND');
  if (progress.generationStatus !== 'failed') throw new AppError('Only a failed section can be retried.', 409, 'SECTION_NOT_FAILED');
  const jobProfile = await JobProfile.findOne({ _id: assessment.jobProfileId, userId });
  if (!jobProfile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  progress.generationStatus = 'pending';
  progress.attempts = 0;
  progress.generatedQuestionCount = 0;
  progress.failureCode = undefined;
  assessment.status = 'generating';
  await assessment.save();
  const response = serializeGenerationProgress(assessment);
  void generateAssessmentQuestions(assessment, jobProfile.analysis).catch((error) => {
    console.error({ code: 'ASSESSMENT_BACKGROUND_RETRY_FAILED', assessmentId: assessment.id, section: sectionName, reason: error.code || 'UNEXPECTED_ERROR', message: error.message });
  });
  return response;
}

export async function getPublicAssessmentQuestions(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (assessment.status !== 'ready') {
    throw new AppError('Assessment questions are not ready.', 409, 'ASSESSMENT_NOT_READY');
  }
  return assessment.questions.map(serializePublicQuestion);
}
