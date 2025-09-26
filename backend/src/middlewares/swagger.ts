import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';
import { config } from '../config/environments';

// Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #10b981 }
    .swagger-ui .scheme-container { background: #1f2937; padding: 20px; border-radius: 8px }
  `,
  customSiteTitle: 'PerfectAI API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};

// Swagger documentation middleware
export const swaggerDocs = swaggerUi.setup(swaggerSpec, swaggerUiOptions);

// Swagger JSON endpoint
export const swaggerJson = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};

// Swagger UI endpoint with authentication check
export const swaggerUiHandler = (req: Request, res: Response, next: NextFunction): void => {
  // In development, allow access without authentication
  if (config.nodeEnv === 'development') {
    (swaggerDocs as any)(req, res, next);
    return;
  }

  // In production, require authentication
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required to access API documentation',
    });
    return;
  }

  (swaggerDocs as any)(req, res, next);
};

// Health check endpoint for API documentation
export const apiHealthCheck = (req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'PerfectAI API is running',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      documentation: '/api-docs',
      health: '/health',
      auth: '/auth',
      testGeneration: '/api/test-generation',
      files: '/files',
    },
  });
};
