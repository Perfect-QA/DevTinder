import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from './logging';

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

class ValidationMiddleware {
  private static createErrorResponse(errors: ValidationError[]): any {
    return {
      success: false,
      error: 'Validation failed',
      details: errors,
      message: 'Please check your input and try again',
    };
  }

  static validateBody(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Validation failed', {
          errors: validationErrors,
          body: req.body,
          url: req.url,
          method: req.method,
        });

        res.status(400).json(ValidationMiddleware.createErrorResponse(validationErrors));
        return;
      }

      req.body = value;
      next();
    };
  }

  static validateQuery(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Query validation failed', {
          errors: validationErrors,
          query: req.query,
          url: req.url,
          method: req.method,
        });

        res.status(400).json(ValidationMiddleware.createErrorResponse(validationErrors));
        return;
      }

      req.query = value;
      next();
    };
  }

  static validateParams(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Params validation failed', {
          errors: validationErrors,
          params: req.params,
          url: req.url,
          method: req.method,
        });

        res.status(400).json(ValidationMiddleware.createErrorResponse(validationErrors));
        return;
      }

      req.params = value;
      next();
    };
  }
}

// Common validation schemas
export const commonSchemas = {
  // User schemas
  userRegistration: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // Test generation schemas
  testGeneration: Joi.object({
    prompt: Joi.string().min(10).max(2000).required().messages({
      'string.min': 'Prompt must be at least 10 characters long',
      'string.max': 'Prompt cannot exceed 2000 characters',
      'any.required': 'Prompt is required',
    }),
    fileIds: Joi.array().items(Joi.string().uuid()).max(10).optional().messages({
      'array.max': 'Cannot process more than 10 files at once',
      'string.uuid': 'Invalid file ID format',
    }),
    count: Joi.number().integer().min(1).max(50).default(10).messages({
      'number.min': 'Count must be at least 1',
      'number.max': 'Count cannot exceed 50',
      'number.integer': 'Count must be a whole number',
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.min': 'Offset cannot be negative',
      'number.integer': 'Offset must be a whole number',
    }),
    requestId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid request ID format',
    }),
  }),

  // File upload schemas
  fileUpload: Joi.object({
    files: Joi.array().items(
      Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().required(),
        size: Joi.number().max(10 * 1024 * 1024).required().messages({
          'number.max': 'File size cannot exceed 10MB',
        }),
        buffer: Joi.binary().required(),
      })
    ).min(1).max(10).required().messages({
      'array.min': 'At least one file is required',
      'array.max': 'Cannot upload more than 10 files at once',
    }),
  }),

  // File content schemas
  fileContent: Joi.object({
    fileId: Joi.string().uuid().required().messages({
      'string.uuid': 'Invalid file ID format',
      'any.required': 'File ID is required',
    }),
    content: Joi.string().min(1).max(1000000).required().messages({
      'string.min': 'Content cannot be empty',
      'string.max': 'Content is too large (max 1MB)',
      'any.required': 'Content is required',
    }),
    fileName: Joi.string().min(1).max(255).required().messages({
      'string.min': 'File name is required',
      'string.max': 'File name is too long',
      'any.required': 'File name is required',
    }),
    mimeType: Joi.string().valid(
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ).required().messages({
      'any.only': 'Unsupported file type',
      'any.required': 'MIME type is required',
    }),
  }),

  // Common ID validation
  mongoId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be a whole number',
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be a whole number',
    }),
  }),
};

export default ValidationMiddleware;
