import { Router } from 'express';
import { performance, summary } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(asyncHandler(authenticate));
router.get('/summary', asyncHandler(summary));
router.get('/performance', asyncHandler(performance));
export default router;
