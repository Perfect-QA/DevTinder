import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { config } from '../config/environments';
import { logger } from './logging';

interface FileValidationOptions {
  maxSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

class FileValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export const createFileValidator = (options: FileValidationOptions = {}) => {
  const {
    maxSize = config.fileUpload.maxSize,
    maxFiles = config.fileUpload.maxFiles,
    allowedTypes = config.fileUpload.allowedTypes,
    allowedExtensions = [],
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const errors: string[] = [];

    // Check number of files
    if (files.length > maxFiles) {
      errors.push(`Cannot upload more than ${maxFiles} files at once`);
    }

    // Validate each file
    for (const file of files) {
      if (file && typeof file === 'object' && 'originalname' in file) {
        const fileErrors = validateFile(file as Express.Multer.File, { maxSize, allowedTypes, allowedExtensions });
        errors.push(...fileErrors);
      }
    }

    if (errors.length > 0) {
      logger.warn('File validation failed', {
        errors,
        fileCount: files.length,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'File validation failed',
        details: errors,
        message: 'Please check your files and try again',
      });
      return;
    }

    next();
  };
};

const validateFile = (
  file: Express.Multer.File,
  options: {
    maxSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
  }
): string[] => {
  const errors: string[] = [];
  const { maxSize, allowedTypes, allowedExtensions } = options;

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File "${file.originalname}" is too large. Maximum size is ${formatBytes(maxSize)}`);
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File "${file.originalname}" has an unsupported type: ${file.mimetype}`);
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = getFileExtension(file.originalname);
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File "${file.originalname}" has an unsupported extension: ${extension}`);
    }
  }

  // Check for potentially dangerous files
  if (isPotentiallyDangerous(file)) {
    errors.push(`File "${file.originalname}" appears to be potentially dangerous and is not allowed`);
  }

  // Check for empty files
  if (file.size === 0) {
    errors.push(`File "${file.originalname}" is empty`);
  }

  return errors;
};

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const isPotentiallyDangerous = (file: Express.Multer.File): boolean => {
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
  const dangerousMimeTypes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-wine-extension-ini',
  ];

  const extension = getFileExtension(file.originalname);
  return dangerousExtensions.includes(`.${extension}`) || dangerousMimeTypes.includes(file.mimetype);
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Enhanced multer configuration with validation
export const createMulterConfig = (options: FileValidationOptions = {}) => {
  const {
    maxSize = config.fileUpload.maxSize,
    maxFiles = config.fileUpload.maxFiles,
    allowedTypes = config.fileUpload.allowedTypes,
  } = options;

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
      files: maxFiles,
    },
    fileFilter: (req, file, cb) => {
      // Check MIME type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        const error = new FileValidationError(
          `File type ${file.mimetype} is not allowed`,
          'INVALID_FILE_TYPE'
        );
        return cb(error);
      }

      // Check file extension
      const extension = getFileExtension(file.originalname);
      const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        'pdf', 'doc', 'docx', 'txt',
        'xls', 'xlsx', 'ppt', 'pptx',
        'zip', 'rar'
      ];

      if (!allowedExtensions.includes(extension)) {
        const error = new FileValidationError(
          `File extension .${extension} is not allowed`,
          'INVALID_FILE_EXTENSION'
        );
        return cb(error);
      }

      // Check for dangerous files
      if (isPotentiallyDangerous({ originalname: file.originalname, mimetype: file.mimetype } as Express.Multer.File)) {
        const error = new FileValidationError(
          'Potentially dangerous file type detected',
          'DANGEROUS_FILE_TYPE'
        );
        return cb(error);
      }

      cb(null, true);
    },
  });
};

// Error handler for multer errors
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof FileValidationError) {
    logger.warn('File validation error', {
      error: error.message,
      code: error.code,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(400).json({
      success: false,
      error: 'File validation failed',
      message: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${formatBytes(config.fileUpload.maxSize)}. Please compress your file or use a smaller file.`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum is ${config.fileUpload.maxFiles} files`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      default:
        message = 'File upload error';
        statusCode = 500;
    }

    logger.warn('Multer error', {
      error: error.message,
      code: error.code,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(statusCode).json({
      success: false,
      error: 'File upload failed',
      message,
      code: error.code,
    });
    return;
  }

  next(error);
};

// File type detection utilities
export const getFileTypeCategory = (mimetype: string): 'image' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'other' => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'spreadsheet';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return 'archive';
  return 'other';
};

export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

export const isDocumentFile = (mimetype: string): boolean => {
  return mimetype.includes('pdf') || 
         mimetype.includes('document') || 
         mimetype.includes('text') ||
         mimetype.includes('word');
};
