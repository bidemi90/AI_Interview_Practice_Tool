import mongoose from 'mongoose';
import { Assessment } from '../models/Assessment.js';
import { JobProfile } from '../models/JobProfile.js';
import { serializeAssessmentMetadata, serializeAssessmentSession, serializePublicQuestion } from '../serializers/assessmentSerializer.js';
import { AppError } from '../utils/AppError.js';
import { createAssessmentBlueprint } from './assessmentPlanningService.js';
import { generateAssessmentQuestions } from './questionGenerationService.js';

function ensureValidId(id, resourceName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`${resourceName} not found.`, 404, `${resourceName.toUpperCase().replace(' ', '_')}_NOT_FOUND`);
}

export async function createAssessment(userId, { jobProfileId, mode }) {
  ensureValidId(jobProfileId, 'Job profile');
  const jobProfile = await JobProfile.findOne({ _id: jobProfileId, userId });
  if (!jobProfile) throw new AppError('Job profile not found.', 404, 'JOB_PROFILE_NOT_FOUND');
  const blueprint = createAssessmentBlueprint(jobProfile.analysis, mode);
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
    generationProgress: { completedSections: 0, totalSections: blueprint.length },
    blueprint,
    generationMetadata: { provider: 'openrouter', attempts: 0 },
  });
  await generateAssessmentQuestions(assessment, jobProfile.analysis);
  return serializeAssessmentMetadata(assessment);
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
  return { id: assessment.id, status: assessment.status, generationProgress: assessment.generationProgress };
}

export async function getPublicAssessmentQuestions(userId, assessmentId) {
  const assessment = await getOwnedAssessment(userId, assessmentId);
  if (assessment.status !== 'ready') {
    throw new AppError('Assessment questions are not ready.', 409, 'ASSESSMENT_NOT_READY');
  }
  return assessment.questions.map(serializePublicQuestion);
}
