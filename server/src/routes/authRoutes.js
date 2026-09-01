import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registrationSchema } from '../validators/authSchemas.js';

const router = Router();
router.post('/register', validateBody(registrationSchema), asyncHandler(register));
router.post('/login', validateBody(loginSchema), asyncHandler(login));
export default router;
