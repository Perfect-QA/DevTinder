import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    defaultValue?: string;
  };
}

const requiredEnvVars: RequiredEnvVars = {
  // Server Configuration
  NODE_ENV: {
    required: true,
    description: 'Application environment (development, production, test)',
    defaultValue: 'development'
  },
  PORT: {
    required: true,
    description: 'Server port number',
    defaultValue: '5000'
  },
  CLIENT_URL: {
    required: true,
    description: 'Frontend application URL'
  },
  
  // Database Configuration (using your actual env variables)
  MONGO_URL: {
    required: true,
    description: 'Primary MongoDB connection string (cloud/production)'
  },
  DB_URL: {
    required: false,
    description: 'Local MongoDB connection string (development)'
  },
  
  // Authentication & Security (using your actual env variables)
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret'
  },
  JWT_REFRESH_SECRET: {
    required: true,
    description: 'JWT refresh token secret'
  },
  JWT_EXPIRY: {
    required: false,
    description: 'JWT token expiry time',
    defaultValue: '7d'
  },
  SESSION_SECRET: {
    required: true,
    description: 'Session secret for express-session'
  },
  PASSWORD_SALT_ROUNDS: {
    required: false,
    description: 'BCrypt salt rounds for password hashing',
    defaultValue: '12'
  },
  COOKIE_EXPIRY: {
    required: false,
    description: 'Cookie expiry time in milliseconds',
    defaultValue: '86400000' // 24 hours
  },
  
  // OAuth Configuration (using your actual env variables)
  GOOGLE_CLIENT_ID: {
    required: false,
    description: 'Google OAuth Client ID'
  },
  GOOGLE_CLIENT_SECRET: {
    required: false,
    description: 'Google OAuth Client Secret'
  },
  GOOGLE_CALLBACK_URL: {
    required: false,
    description: 'Google OAuth callback URL',
  },
  GITHUB_CLIENT_ID: {
    required: false,
    description: 'GitHub OAuth Client ID'
  },
  GITHUB_CLIENT_SECRET: {
    required: false,
    description: 'GitHub OAuth Client Secret'
  },
  GITHUB_CALLBACK_URL: {
    required: false,
    description: 'GitHub OAuth callback URL',
  },
  
  // Email Configuration (using your actual env variables)
  EMAIL_USER: {
    required: false,
    description: 'Email username for SMTP'
  },
  EMAIL_PASS: {
    required: false,
    description: 'Email password for SMTP'
  },
  
  // File Upload Configuration
  MAX_FILE_SIZE: {
    required: false,
    description: 'Maximum file size in bytes',
    defaultValue: '10485760' // 10MB
  },
  MAX_FILES: {
    required: false,
    description: 'Maximum number of files per upload',
    defaultValue: '10'
  },
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    description: 'Rate limiting window in milliseconds',
    defaultValue: '900000' // 15 minutes
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    description: 'Maximum requests per window',
    defaultValue: '50'
  },
  
  // Security Configuration
  CORS_ORIGINS: {
    required: false,
    description: 'Comma-separated list of allowed CORS origins',
  },
  
  // OpenAI Configuration
  OPENAI_API_KEY: {
    required: true,
    description: 'OpenAI API key for test case generation'
  },
  OPENAI_MODEL: {
    required: false,
    description: 'OpenAI model to use for generation',
    defaultValue: 'gpt-3.5-turbo'
  },
  OPENAI_MAX_TOKENS: {
    required: false,
    description: 'Maximum tokens for OpenAI responses',
    defaultValue: '2000'
  },
  
  // Development Configuration
  DEBUG: {
    required: false,
    description: 'Enable debug mode',
    defaultValue: 'false'
  },
  ENABLE_SWAGGER: {
    required: false,
    description: 'Enable API documentation',
    defaultValue: 'false'
  }
};

/**
 * Validates environment variables and sets defaults
 */
export const validateEnvironment = (): void => {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // console.log('🔍 Validating environment variables...\n');
  
  // Check required variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    
    if (config.required && !value) {
      missing.push(key);
    } else if (!value && config.defaultValue) {
      // Set default value
      process.env[key] = config.defaultValue;
      console.log(`⚠️  ${key}: Using default value (${config.defaultValue})`);
    } else if (value) {
      // console.log(`✅ ${key}: Set`);
      
      // Additional validation for specific variables
      if (key === 'JWT_SECRET' || key === 'JWT_REFRESH_SECRET' || key === 'SESSION_SECRET') {
        if (value.length < 16) {
          warnings.push(`${key} should be at least 16 characters long for security`);
        }
      }
      
      if ((key === 'MONGO_URL' || key === 'DB_URL') && !value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        warnings.push(`${key} should start with 'mongodb://' or 'mongodb+srv://'`);
      }
    }
  }
  
  // Check if at least one database URL is set
  if (!process.env.MONGO_URL && !process.env.DB_URL) {
    missing.push('MONGO_URL or DB_URL');
  }
  
  // Check OAuth variables (optional but should be paired)
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  if ((googleClientId && !googleClientSecret) || (!googleClientId && googleClientSecret)) {
    warnings.push('Google OAuth: Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET should be set together');
  }
  
  if ((githubClientId && !githubClientSecret) || (!githubClientId && githubClientSecret)) {
    warnings.push('GitHub OAuth: Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET should be set together');
  }
  
  // Check email configuration (optional but should be paired)
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  if ((emailUser && !emailPass) || (!emailUser && emailPass)) {
    warnings.push('Email: Both EMAIL_USER and EMAIL_PASS should be set together');
  }
  
  // Display results
  console.log('\n==========================================');
  
  if (missing.length > 0) {
    console.log('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(key => {
      const config = requiredEnvVars[key];
      console.log(`   • ${key}: ${config?.description || 'No description available'}`);
    });
    console.log('\n💡 Create a .env file in the backend directory with these variables.');
    console.log('   Copy env.example to backend/.env and update the values.');
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are properly configured!');
  }
  
  console.log('==========================================\n');
};

/**
 * Get environment variable with type conversion
 */
export const getEnvVar = <T = string>(key: string, defaultValue?: T): T => {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  
  // Type conversion
  if (typeof defaultValue === 'number') {
    return parseInt(value, 10) as T;
  }
  
  if (typeof defaultValue === 'boolean') {
    return (value.toLowerCase() === 'true') as T;
  }
  
  return value as T;
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = (): boolean => {
  return getEnvVar('DEBUG', false);
};
