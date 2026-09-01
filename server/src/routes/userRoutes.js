import { Router } from 'express';
import { getMe, updateMe, updatePassword } from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { passwordChangeSchema } from '../validators/authSchemas.js';
import { profileUpdateSchema } from '../validators/userSchemas.js';

const router = Router();
router.use(asyncHandler(authenticate));
router.get('/me', getMe);
router.patch('/me', validateBody(profileUpdateSchema), asyncHandler(updateMe));
router.patch('/me/password', validateBody(passwordChangeSchema), asyncHandler(updatePassword));
export default router;
