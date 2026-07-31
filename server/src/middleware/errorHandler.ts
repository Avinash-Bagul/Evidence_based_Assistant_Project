import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log error
  if (statusCode >= 500) {
    logger.error({ err, statusCode }, 'Server error');
  } else {
    logger.warn({ err, statusCode }, 'Client error');
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function createAppError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
