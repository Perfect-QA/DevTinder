import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';
import { formatErrorForUser, createUserFriendlyError, ERROR_MESSAGES } from '../utils/errorMessages';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_SERVER_ERROR'
): CustomError => {
  return new CustomError(message, statusCode, code);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let userFriendlyError = formatErrorForUser(error);

  // Log the error
  logger.error('Application error occurred', {
    error: error.message,
    stack: error.stack,
    statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?._id,
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    userFriendlyError = ERROR_MESSAGES.VALIDATION_FAILED || userFriendlyError;
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    userFriendlyError = ERROR_MESSAGES.RESOURCE_NOT_FOUND || userFriendlyError;
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    userFriendlyError = ERROR_MESSAGES.EMAIL_ALREADY_EXISTS || userFriendlyError;
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    userFriendlyError = ERROR_MESSAGES.SESSION_EXPIRED || userFriendlyError;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    userFriendlyError = ERROR_MESSAGES.SESSION_EXPIRED || userFriendlyError;
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        userFriendlyError = ERROR_MESSAGES.FILE_TOO_LARGE || userFriendlyError;
        break;
      case 'LIMIT_FILE_COUNT':
        userFriendlyError = ERROR_MESSAGES.TOO_MANY_FILES || userFriendlyError;
        break;
      default:
        userFriendlyError = ERROR_MESSAGES.FILE_UPLOAD_FAILED || userFriendlyError;
    }
    statusCode = userFriendlyError.statusCode;
  }

  // Handle OpenAI API errors
  if (error.message?.includes('OpenAI') || error.message?.includes('API key')) {
    userFriendlyError = ERROR_MESSAGES.AI_SERVICE_UNAVAILABLE || userFriendlyError;
    statusCode = 503;
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  const response: any = {
    success: false,
    error: userFriendlyError?.userMessage || 'An error occurred',
    code: userFriendlyError?.code || 'UNKNOWN_ERROR',
  };

  // Add additional details in development
  if (isDevelopment) {
    response.details = {
      originalError: error.message,
      stack: error.stack,
      statusCode,
      url: req.url,
      method: req.method,
    };
  }

  // Add request ID for tracking in production
  if (isProduction) {
    response.requestId = req.headers['x-request-id'] || 'unknown';
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const userFriendlyError = ERROR_MESSAGES.RESOURCE_NOT_FOUND;
  
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: userFriendlyError?.userMessage || 'Resource not found',
    code: userFriendlyError?.code || 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`,
  });
};

export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.name === 'ValidationError') {
    const userFriendlyError = ERROR_MESSAGES.VALIDATION_FAILED;
    
    logger.warn('Validation error', {
      error: error.message,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(400).json({
      success: false,
      error: userFriendlyError?.userMessage || 'Validation failed',
      code: userFriendlyError?.code || 'VALIDATION_ERROR',
      details: error.details || error.message,
    });
    return;
  }

  next(error);
};

export const rateLimitErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.status === 429) {
    const userFriendlyError = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
    
    logger.warn('Rate limit exceeded', {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?._id,
    });

    res.status(429).json({
      success: false,
      error: userFriendlyError?.userMessage || 'Rate limit exceeded',
      code: userFriendlyError?.code || 'RATE_LIMIT_EXCEEDED',
      retryAfter: error.retryAfter || 60,
    });
    return;
  }

  next(error);
};

export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });

  // Graceful shutdown
  process.exit(1);
};

export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });

  // Graceful shutdown
  process.exit(1);
};
