export function notFound(request, response) {
  response.status(404).json({
    success: false,
    error: { message: `Route not found: ${request.method} ${request.originalUrl}` },
  });
}

