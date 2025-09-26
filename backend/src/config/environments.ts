import { getEnvVar } from './envValidator';

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  database: {
    mongoUrl: string;
    dbName: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiry: string;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  fileUpload: {
    maxSize: number;
    maxFiles: number;
    allowedTypes: string[];
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
  security: {
    enableCors: boolean;
    enableHelmet: boolean;
    enableRateLimit: boolean;
  };
}

const createConfig = (): EnvironmentConfig => {
  const nodeEnv = getEnvVar('NODE_ENV', 'development');
  const isProduction = (nodeEnv as string) === 'production';
  const isDevelopment = (nodeEnv as string) === 'development';
  const isTest = (nodeEnv as string) === 'test';

  return {
    nodeEnv,
    port: getEnvVar('PORT', 5000),
    clientUrl: getEnvVar('CLIENT_URL', 'http://localhost:3000'),
    
    database: {
      mongoUrl: getEnvVar('MONGO_URL', 'mongodb://localhost:27017/perfectai'),
      dbName: getEnvVar('DB_NAME', 'perfectai'),
    },
    
    jwt: {
      secret: getEnvVar('JWT_SECRET', ''),
      refreshSecret: getEnvVar('JWT_REFRESH_SECRET', ''),
      expiry: getEnvVar('JWT_EXPIRY', '7d'),
    },
    
    session: {
      secret: getEnvVar('SESSION_SECRET', ''),
      maxAge: getEnvVar('SESSION_MAX_AGE', 24 * 60 * 60 * 1000), // 24 hours
      secure: isProduction,
    },
    
    cors: {
      origins: getEnvVar('CORS_ORIGINS', 'http://localhost:3000').split(',').map(origin => origin.trim()),
      credentials: true,
    },
    
    rateLimit: {
      windowMs: getEnvVar('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      maxRequests: getEnvVar('RATE_LIMIT_MAX_REQUESTS', 50),
    },
    
    fileUpload: {
      maxSize: getEnvVar('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
      maxFiles: getEnvVar('MAX_FILES', 10),
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-rar-compressed'
      ],
    },
    
    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY', ''),
      model: getEnvVar('OPENAI_MODEL', 'gpt-3.5-turbo'),
      maxTokens: getEnvVar('OPENAI_MAX_TOKENS', 2000),
    },
    
    logging: {
      level: isDevelopment ? 'debug' : isProduction ? 'error' : 'info',
      enableConsole: true,
      enableFile: isProduction,
    },
    
    security: {
      enableCors: true,
      enableHelmet: isProduction,
      enableRateLimit: true,
    },
  };
};

export const config = createConfig();

// Environment-specific overrides
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const baseConfig = config;
  
  if (baseConfig.nodeEnv === 'test') {
    return {
      ...baseConfig,
      database: {
        ...baseConfig.database,
        dbName: 'perfectai_test',
      },
      logging: {
        ...baseConfig.logging,
        level: 'error',
        enableConsole: false,
        enableFile: false,
      },
    };
  }
  
  if (baseConfig.nodeEnv === 'production') {
    return {
      ...baseConfig,
      logging: {
        ...baseConfig.logging,
        level: 'warn',
        enableConsole: false,
        enableFile: true,
      },
      security: {
        ...baseConfig.security,
        enableHelmet: true,
      },
    };
  }
  
  return baseConfig;
};
