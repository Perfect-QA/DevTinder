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
  customJs: [
    'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
    'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js'
  ],
  customCssUrl: 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css',
  swaggerUrl: '/api-docs.json'
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
    // Serve custom HTML with CDN resources
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PerfectAI API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <link rel="icon" href="/favicon.ico" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #10b981 }
    .swagger-ui .scheme-container { background: #1f2937; padding: 20px; border-radius: 8px }
    .auth-warning { 
      background: #fef3c7; 
      border: 1px solid #f59e0b; 
      color: #92400e; 
      padding: 12px; 
      border-radius: 6px; 
      margin: 10px 0; 
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        requestInterceptor: function(request) {
          // Add authorization header if token is available
          const token = localStorage.getItem('swagger-ui-token');
          if (token) {
            request.headers.Authorization = 'Bearer ' + token;
            console.log('Authorization header added to request:', request.url);
          } else {
            console.log('No token found for request:', request.url);
          }
          return request;
        },
        responseInterceptor: function(response) {
          // Check if response is 401/403 and clear invalid token
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('swagger-ui-token');
            // Show error message
            const errorMsg = response.status === 401 ? 'Token expired or invalid' : 'Access denied';
            alert('ERROR: ' + errorMsg + '. Please login again.');
          }
          return response;
        },
        onComplete: function() {
          console.log('=== SWAGGER UI COMPLETE - STARTING SIMPLE SETUP ===');
          
          // Simple function to create button
          function createSimpleButton() {
            console.log('Creating simple button...');
            
            // Remove any existing buttons
            const existing = document.querySelector('.simple-auth-button');
            if (existing) existing.remove();
            
            // Create button
            const button = document.createElement('button');
            button.className = 'simple-auth-button';
            button.innerHTML = 'ADMIN LOGIN';
            button.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; background: #10b981; color: white; padding: 15px 25px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            
            button.onclick = function() {
              const token = prompt('Enter your admin JWT token:');
              if (token) {
                localStorage.setItem('swagger-ui-token', token);
                alert('Token saved! You are now authorized.');
                button.innerHTML = 'LOGGED IN';
                button.style.background = '#059669';
              }
            };
            
            document.body.appendChild(button);
            console.log('Simple button created and added to body');
          }
          
          // Create button immediately
          createSimpleButton();
          
          // Also create after delays
          setTimeout(createSimpleButton, 1000);
          setTimeout(createSimpleButton, 3000);
          setTimeout(createSimpleButton, 5000);
        }
      });
    };
  </script>
</body>
</html>`;
    res.send(html);
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
