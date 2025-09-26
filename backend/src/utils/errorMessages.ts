export interface UserFriendlyError {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  category: 'validation' | 'authentication' | 'authorization' | 'notFound' | 'server' | 'rateLimit' | 'fileUpload';
}

export const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // Authentication errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect. Please check your credentials and try again.',
    statusCode: 401,
    category: 'authentication',
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    userMessage: 'No account found with this email address. Please check your email or sign up for a new account.',
    statusCode: 404,
    category: 'authentication',
  },
  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    message: 'Account is locked',
    userMessage: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or contact support.',
    statusCode: 423,
    category: 'authentication',
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'Session has expired',
    userMessage: 'Your session has expired. Please log in again to continue.',
    statusCode: 401,
    category: 'authentication',
  },

  // Validation errors
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: 'Validation failed',
    userMessage: 'Please check your input and try again. Make sure all required fields are filled correctly.',
    statusCode: 400,
    category: 'validation',
  },
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    message: 'Invalid email format',
    userMessage: 'Please enter a valid email address (e.g., user@example.com).',
    statusCode: 400,
    category: 'validation',
  },
  WEAK_PASSWORD: {
    code: 'WEAK_PASSWORD',
    message: 'Password does not meet requirements',
    userMessage: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.',
    statusCode: 400,
    category: 'validation',
  },
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already registered',
    userMessage: 'An account with this email address already exists. Please use a different email or try logging in.',
    statusCode: 409,
    category: 'validation',
  },

  // File upload errors
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'File size exceeds limit',
    userMessage: 'The file is too large. Please choose a file smaller than 10MB.',
    statusCode: 413,
    category: 'fileUpload',
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    message: 'Unsupported file type',
    userMessage: 'This file type is not supported. Please upload images, documents, or spreadsheets.',
    statusCode: 400,
    category: 'fileUpload',
  },
  TOO_MANY_FILES: {
    code: 'TOO_MANY_FILES',
    message: 'Too many files uploaded',
    userMessage: 'You can only upload up to 10 files at once. Please reduce the number of files and try again.',
    statusCode: 400,
    category: 'fileUpload',
  },
  FILE_UPLOAD_FAILED: {
    code: 'FILE_UPLOAD_FAILED',
    message: 'File upload failed',
    userMessage: 'Failed to upload your files. Please check your internet connection and try again.',
    statusCode: 500,
    category: 'fileUpload',
  },

  // Test generation errors
  TEST_GENERATION_FAILED: {
    code: 'TEST_GENERATION_FAILED',
    message: 'Test case generation failed',
    userMessage: 'We couldn\'t generate test cases at the moment. Please try again in a few minutes.',
    statusCode: 500,
    category: 'server',
  },
  INVALID_PROMPT: {
    code: 'INVALID_PROMPT',
    message: 'Invalid test generation prompt',
    userMessage: 'Please provide a more detailed prompt (at least 10 characters) describing what test cases you need.',
    statusCode: 400,
    category: 'validation',
  },
  AI_SERVICE_UNAVAILABLE: {
    code: 'AI_SERVICE_UNAVAILABLE',
    message: 'AI service temporarily unavailable',
    userMessage: 'Our AI service is temporarily unavailable. Please try again in a few minutes.',
    statusCode: 503,
    category: 'server',
  },

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    userMessage: 'You\'ve made too many requests. Please wait a few minutes before trying again.',
    statusCode: 429,
    category: 'rateLimit',
  },
  LOGIN_RATE_LIMIT: {
    code: 'LOGIN_RATE_LIMIT',
    message: 'Too many login attempts',
    userMessage: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    statusCode: 429,
    category: 'rateLimit',
  },

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions',
    userMessage: 'You don\'t have permission to perform this action. Please contact your administrator.',
    statusCode: 403,
    category: 'authorization',
  },
  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access denied',
    userMessage: 'Access to this resource is denied. Please log in or contact support if you believe this is an error.',
    statusCode: 403,
    category: 'authorization',
  },

  // Not found errors
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found',
    userMessage: 'The requested resource was not found. Please check the URL or try again later.',
    statusCode: 404,
    category: 'notFound',
  },
  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    message: 'File not found',
    userMessage: 'The requested file was not found. It may have been deleted or moved.',
    statusCode: 404,
    category: 'notFound',
  },

  // Server errors
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again later or contact support if the problem persists.',
    statusCode: 500,
    category: 'server',
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    userMessage: 'We\'re experiencing technical difficulties. Please try again in a few minutes.',
    statusCode: 500,
    category: 'server',
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    userMessage: 'This service is temporarily unavailable. Please try again later.',
    statusCode: 503,
    category: 'server',
  },
};

export const createUserFriendlyError = (
  errorCode: string,
  customMessage?: string,
  additionalInfo?: Record<string, any>
): UserFriendlyError => {
  const baseError = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  
  if (!baseError) {
    return ERROR_MESSAGES.INTERNAL_SERVER_ERROR!;
  }
  
  return {
    ...baseError,
    message: customMessage || baseError.message,
    userMessage: additionalInfo?.userMessage || baseError.userMessage,
  };
};

export const getErrorByCategory = (category: UserFriendlyError['category']): UserFriendlyError[] => {
  return Object.values(ERROR_MESSAGES).filter(error => error.category === category);
};

export const isRetryableError = (errorCode: string): boolean => {
  const retryableErrors = [
    'AI_SERVICE_UNAVAILABLE',
    'SERVICE_UNAVAILABLE',
    'DATABASE_ERROR',
    'FILE_UPLOAD_FAILED',
  ];
  return retryableErrors.includes(errorCode);
};

export const getRetryDelay = (errorCode: string, attemptCount: number): number => {
  if (!isRetryableError(errorCode)) return 0;
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
  
  return delay;
};

export const formatErrorForUser = (error: any): UserFriendlyError => {
  // If it's already a UserFriendlyError, return it
  if (error.code && ERROR_MESSAGES[error.code]) {
    return error;
  }

  // Handle common error patterns
  if (error.message?.includes('validation')) {
    return ERROR_MESSAGES.VALIDATION_FAILED!;
  }

  if (error.message?.includes('unauthorized') || error.message?.includes('jwt')) {
    return ERROR_MESSAGES.SESSION_EXPIRED!;
  }

  if (error.message?.includes('not found')) {
    return ERROR_MESSAGES.RESOURCE_NOT_FOUND!;
  }

  if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
    return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED!;
  }

  if (error.message?.includes('file') && error.message?.includes('large')) {
    return ERROR_MESSAGES.FILE_TOO_LARGE!;
  }

  if (error.message?.includes('file') && error.message?.includes('type')) {
    return ERROR_MESSAGES.INVALID_FILE_TYPE!;
  }

  // Default to internal server error
  return ERROR_MESSAGES.INTERNAL_SERVER_ERROR!;
};
