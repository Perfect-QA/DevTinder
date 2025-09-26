import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environments';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PerfectAI API',
      version: '1.0.0',
      description: 'AI-powered test case generation API with authentication and file management',
      contact: {
        name: 'PerfectAI Support',
        email: 'support@perfectai.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.perfectai.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL',
              example: 'https://example.com/avatar.jpg',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        TestCase: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Test case ID',
              example: 1,
            },
            summary: {
              type: 'string',
              description: 'Brief description of the test case',
              example: 'Verify user login with valid credentials',
            },
            precondition: {
              type: 'string',
              description: 'Conditions that must be met before the test',
              example: 'User account exists and is not locked',
            },
            steps: {
              type: 'string',
              description: 'Detailed test steps',
              example: '1. Navigate to login page\n2. Enter valid email\n3. Enter valid password\n4. Click login button',
            },
            expectedResult: {
              type: 'string',
              description: 'Expected outcome when test passes',
              example: 'User should be logged in and redirected to dashboard',
            },
            priority: {
              type: 'string',
              enum: ['P1', 'P2', 'P3'],
              description: 'Test case priority',
              example: 'P1',
            },
          },
        },
        UploadedFile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'File ID',
              example: 'file-1234567890',
            },
            filename: {
              type: 'string',
              description: 'Generated filename',
              example: 'file-1234567890.pdf',
            },
            originalName: {
              type: 'string',
              description: 'Original filename',
              example: 'requirements.pdf',
            },
            size: {
              type: 'integer',
              description: 'File size in bytes',
              example: 1024000,
            },
            type: {
              type: 'string',
              enum: ['image', 'file'],
              description: 'File type category',
              example: 'file',
            },
            mimetype: {
              type: 'string',
              description: 'MIME type',
              example: 'application/pdf',
            },
            url: {
              type: 'string',
              description: 'File access URL',
              example: '/file/file-1234567890.pdf',
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request parameters',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Validation failed',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: 'Please provide a valid email address',
                  },
                  value: {
                    type: 'string',
                    example: 'invalid-email',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        sessionAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/controllers/**/*.ts',
    './dist/src/routes/*.js',
    './dist/src/controllers/*.js',
    './dist/src/controllers/**/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
