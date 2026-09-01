import { Router } from 'express';
import { analyzeJob, deleteJob, getAssessmentPlan, getJob, getJobAssessments, listJobs } from '../controllers/jobController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzeJobSchema } from '../validators/jobSchemas.js';

const router = Router();
router.use(asyncHandler(authenticate));
router.post('/analyze', validateBody(analyzeJobSchema), asyncHandler(analyzeJob));
router.get('/', asyncHandler(listJobs));
router.get('/:jobProfileId/assessments', asyncHandler(getJobAssessments));
router.get('/:jobProfileId/assessment-plan', asyncHandler(getAssessmentPlan));
router.get('/:jobProfileId', asyncHandler(getJob));
router.delete('/:jobProfileId', asyncHandler(deleteJob));
export default router;
