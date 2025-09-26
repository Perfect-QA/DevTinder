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
          }
          return request;
        },
        responseInterceptor: function(response) {
          // Check if response is 401/403 and clear invalid token
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('swagger-ui-token');
            // Show error message
            const errorMsg = response.status === 401 ? 'Token expired or invalid' : 'Access denied';
            alert('❌ ' + errorMsg + '. Please login again.');
          }
          return response;
        },
        onComplete: function() {
          // Function to validate JWT format
          function isValidJWTFormat(token) {
            if (!token || typeof token !== 'string') return false;
            
            // JWT should have 3 parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            // Each part should be base64 encoded
            try {
              parts.forEach(part => {
                if (part.length === 0) throw new Error('Empty part');
                // Check if it's valid base64
                atob(part.replace(/-/g, '+').replace(/_/g, '/'));
              });
              return true;
            } catch (e) {
              return false;
            }
          }
          
          // Clear any invalid tokens on page load
          const existingToken = localStorage.getItem('swagger-ui-token');
          if (existingToken && !isValidJWTFormat(existingToken)) {
            localStorage.removeItem('swagger-ui-token');
            console.log('Removed invalid token from storage');
          }
          
          // Add custom authorization button
          const authBtn = document.createElement('button');
          authBtn.innerHTML = '🔑 Admin Login';
          authBtn.className = 'btn authorize';
          authBtn.style.cssText = 'margin-left: 10px; background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
          authBtn.onclick = function() {
            const token = prompt('Enter your admin JWT token:');
            if (token) {
              // First validate JWT format
              if (!isValidJWTFormat(token)) {
                alert('❌ Invalid JWT format. Please enter a valid JWT token.');
                return;
              }
              
              // Validate token by making a test request to an admin endpoint
              fetch('/admin/users/list', {
                method: 'GET',
                headers: {
                  'Authorization': 'Bearer ' + token,
                  'Content-Type': 'application/json'
                }
              })
              .then(response => {
                if (response.ok) {
                  localStorage.setItem('swagger-ui-token', token);
                  alert('✅ Token validated! You are now authorized to test admin APIs.');
                  location.reload();
                } else if (response.status === 401) {
                  alert('❌ Invalid token. Please check your credentials and try again.');
                } else if (response.status === 403) {
                  alert('❌ Access denied. This token does not have admin privileges.');
                } else {
                  alert('❌ Token validation failed. Please try again.');
                }
              })
              .catch(error => {
                console.error('Token validation error:', error);
                alert('❌ Token validation failed. Please check your connection and try again.');
              });
            }
          };
          
          const authorizeBtn = document.querySelector('.auth-btn-wrapper');
          if (authorizeBtn) {
            authorizeBtn.appendChild(authBtn);
          }
          
          // Add logout button and status indicator if token exists
          const currentToken = localStorage.getItem('swagger-ui-token');
          if (currentToken) {
            // Add status indicator
            const statusDiv = document.createElement('div');
            statusDiv.innerHTML = '✅ Admin Authorized';
            statusDiv.style.cssText = 'margin-left: 10px; color: #10b981; font-weight: bold; display: inline-block;';
            
            // Add logout button
            const logoutBtn = document.createElement('button');
            logoutBtn.innerHTML = '🚪 Logout';
            logoutBtn.className = 'btn logout';
            logoutBtn.style.cssText = 'margin-left: 10px; background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;';
            logoutBtn.onclick = function() {
              localStorage.removeItem('swagger-ui-token');
              alert('Logged out successfully!');
              location.reload();
            };
            
            if (authorizeBtn) {
              authorizeBtn.appendChild(statusDiv);
              authorizeBtn.appendChild(logoutBtn);
            }
          } else {
            // Add unauthorized status
            const statusDiv = document.createElement('div');
            statusDiv.innerHTML = '❌ Not Authorized';
            statusDiv.style.cssText = 'margin-left: 10px; color: #ef4444; font-weight: bold; display: inline-block;';
            
            if (authorizeBtn) {
              authorizeBtn.appendChild(statusDiv);
            }
          }
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
