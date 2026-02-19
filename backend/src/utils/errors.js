import * as Sentry from '@sentry/node';
import logger from '../services/logger.js';

// ── Sentry error monitoring ──────────────────────────────────────────────────
// Set SENTRY_DSN in your Render backend environment variables.
// Get your DSN: https://sentry.io → Project → Settings → Client Keys
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
  logger.info('Sentry initialized');
}

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Error handler middleware
export function errorHandler(err, req, res, next) {
  // Log error
  logger.logError(err, req);

  // Send unexpected errors (5xx) to Sentry
  if (process.env.SENTRY_DSN && (!err.isOperational || err.statusCode >= 500)) {
    Sentry.captureException(err, {
      user: req.user ? { id: req.user.userId } : undefined,
    });
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists',
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      code: 'NOT_FOUND',
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle operational errors (expected, user-facing)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    });
  }

  // Unexpected errors — don't leak details in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// 404 handler
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}

// Handle uncaught exceptions and unhandled rejections
export function handleUncaughtExceptions() {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    if (process.env.SENTRY_DSN) Sentry.captureException(reason);
  });
}
