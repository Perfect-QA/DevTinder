import { Request, Response, NextFunction } from 'express';
import { Document } from 'mongoose';
import { IUser } from '../models/user';

// File upload types
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  type: 'image' | 'file';
  mimetype: string;
  url: string;
  uploadedAt: string;
  extractedContent?: string;
}

export interface FileCacheData {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
  size: number;
  type: 'image' | 'file';
  uploadedAt: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  files: UploadedFile[];
  cacheInfo?: {
    totalFiles: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

export interface CacheStatsResponse {
  success: boolean;
  stats: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: string;
    fileTypes: Record<string, number>;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
}

// User types
export interface AppUser {
  _id?: string;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserDocument extends Document {
  email: string;
  name: string;
  password: string;
  avatar?: string;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Override Express User type to use our IUser
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

// Middleware types
export type AuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;

// Route handler types
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export type AuthRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;

// Database types
export interface DatabaseConfig {
  connectDB: () => Promise<void>;
}

// OAuth types
export interface OAuthConfig {
  initialize: () => void;
  session: () => void;
}

// Session types
export interface SessionData {
  passport?: {
    user?: string;
  };
}

// Environment variables (matching your actual env.example)
export interface EnvironmentVariables {
  // Server Configuration
  NODE_ENV: string;
  PORT: string;
  CLIENT_URL: string;
  
  // Database Configuration
  MONGO_URL?: string;
  DB_URL?: string;
  
  // Authentication & Security
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRY?: string;
  SESSION_SECRET: string;
  PASSWORD_SALT_ROUNDS?: string;
  COOKIE_EXPIRY?: string;
  
  // OAuth Configuration (Optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
  
  // Email Configuration (Optional)
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  
  // File Upload Configuration
  MAX_FILE_SIZE?: string;
  MAX_FILES?: string;
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  
  // Security Configuration
  CORS_ORIGINS?: string;
  
  // OpenAI Configuration
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_MAX_TOKENS?: string;
  
  // Development Configuration
  DEBUG?: string;
  ENABLE_SWAGGER?: string;
}

// Test case types
export interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
}

export interface TestGenerationRequest {
  prompt: string;
  fileIds?: string[];
  count?: number;
  offset?: number;
  requestId?: string;
}

export interface TestGenerationResponse {
  success: boolean;
  testCases: TestCase[];
  totalGenerated: number;
  hasMore: boolean;
  message?: string;
  error?: string;
}

// Re-export context window types
export * from './contextWindow';