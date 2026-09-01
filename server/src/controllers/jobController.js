import { analyzeAndSaveJob } from '../services/jobAnalysisService.js';
import { deleteOwnedJobProfile, getOwnedJobProfile, listJobProfiles } from '../services/jobProfileService.js';
import { AppError } from '../utils/AppError.js';
import { jobListQuerySchema } from '../validators/jobSchemas.js';

export async function analyzeJob(request, response) {
  const jobProfile = await analyzeAndSaveJob(request.user.id, request.validatedBody);
  response.status(201).json({ success: true, data: { jobProfile } });
}

export async function listJobs(request, response) {
  const result = jobListQuerySchema.safeParse(request.query);
  if (!result.success) throw new AppError('Invalid pagination parameters.', 400, 'VALIDATION_ERROR');
  const data = await listJobProfiles(request.user.id, result.data);
  response.status(200).json({ success: true, data });
}

export async function getJob(request, response) {
  const jobProfile = await getOwnedJobProfile(request.user.id, request.params.jobProfileId);
  response.status(200).json({ success: true, data: { jobProfile } });
}

export async function deleteJob(request, response) {
  await deleteOwnedJobProfile(request.user.id, request.params.jobProfileId);
  response.status(200).json({ success: true, data: { message: 'Job analysis deleted.' } });
}
