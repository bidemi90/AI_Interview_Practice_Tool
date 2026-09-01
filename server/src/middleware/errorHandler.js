export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;
  const safeError = Boolean(error.isOperational);

  if (statusCode >= 500) {
    console.error({ code: error.code || 'INTERNAL_SERVER_ERROR', message: error.message });
  }

  response.status(statusCode).json({
    success: false,
    error: {
      message: statusCode >= 500 && !safeError ? 'Internal server error.' : error.message,
      code: statusCode >= 500 && !safeError ? 'INTERNAL_SERVER_ERROR' : error.code || 'REQUEST_ERROR',
      ...(safeError && error.details ? { details: error.details } : {}),
    },
  });
}
