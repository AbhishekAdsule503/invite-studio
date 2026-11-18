import { ZodError } from 'zod';

export function errorHandler(err, _req, res, _next) {
  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Prisma Known Request Error
  if (err?.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      const target = err.meta?.target ? ` (${err.meta.target})` : '';
      return res.status(409).json({
        success: false,
        error: `A record with this unique value already exists${target}.`
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'The requested resource was not found.'
      });
    }
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication token has expired. Please sign in again.'
    });
  }

  // Multer File Upload Errors
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: err.code === 'LIMIT_FILE_SIZE' ? 'Image file must be under 5MB.' : err.message
    });
  }

  // Custom HTTP errors with statusCode
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isPublic || statusCode < 500 ? err.message : 'An unexpected server error occurred.';

  if (statusCode >= 500) {
    console.error('[SERVER ERROR]', err);
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

