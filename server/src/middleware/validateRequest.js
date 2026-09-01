import { AppError } from '../utils/AppError.js';

export const validateBody = (schema) => (request, _response, next) => {
  const result = schema.safeParse(request.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    return next(new AppError('Validation failed.', 400, 'VALIDATION_ERROR', details));
  }
  request.validatedBody = result.data;
  return next();
};
