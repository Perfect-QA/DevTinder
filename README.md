# PerfectAI - AI-Powered Test Case Generation Platform

A full-stack application for AI-powered test case generation with authentication, admin management, and comprehensive API documentation.

## 🚀 Project Overview

PerfectAI is a sophisticated platform that leverages AI to automatically generate test cases from code files. It features a React frontend, Node.js/Express backend, and includes comprehensive admin management capabilities.

## 📁 Project Structure

```
perfectAI/
├── 📁 backend/                 # Node.js/Express Backend
├── 📁 frontend/                # React Frontend
├── 📄 .gitignore              # Git ignore rules
├── 📄 package.json            # Root package configuration
└── 📄 README.md               # This file
```

## 🔧 Backend Structure (`/backend`)

### **Core Application Files**
- **`src/app.ts`** - Main Express application entry point
- **`package.json`** - Backend dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration

### **Configuration (`/src/config`)**
- **`database.ts`** - MongoDB connection and configuration
- **`databaseIndexes.ts`** - Database index creation and management
- **`envValidator.ts`** - Environment variable validation
- **`environments.ts`** - Environment-specific configurations
- **`oauth.ts`** - OAuth provider configurations
- **`swagger.ts`** - API documentation configuration

### **Controllers (`/src/controllers`)**
- **`adminAuditController.ts`** - Admin audit log management
- **`adminUserController.ts`** - Admin user CRUD operations
- **`auth/`** - Authentication controllers
  - `cleanupController.ts` - Session cleanup and maintenance
  - `dashboardController.ts` - User dashboard data
  - `loginController.ts` - User login and JWT token generation
  - `logoutController.ts` - User logout and session cleanup
  - `signupController.ts` - User registration
- **`oauthController.ts`** - OAuth authentication handling
- **`openaiAdminController.ts`** - OpenAI API management and monitoring
- **`testGenerationController.ts`** - AI test case generation logic

### **Middlewares (`/src/middlewares`)**
- **`adminAuditLogger.ts`** - Logs admin actions for audit trails
- **`adminAuth.ts`** - Admin authentication and authorization
- **`authmiddleware.ts`** - Basic JWT authentication
- **`enhancedAuth.ts`** - Advanced authentication with role-based access
- **`errorHandler.ts`** - Centralized error handling
- **`fileValidation.ts`** - File upload validation
- **`logging.ts`** - Request/response logging
- **`openaiTokenTracking.ts`** - OpenAI token usage tracking
- **`rateLimiting.ts`** - API rate limiting
- **`securityMiddleware.ts`** - Security headers and CORS
- **`sessionMiddleware.ts`** - Session management
- **`swagger.ts`** - Swagger UI configuration and authorization
- **`validation.ts`** - Request validation middleware

### **Models (`/src/models`)**
- **`adminAuditLog.ts`** - Admin action audit log schema
- **`adminUser.ts`** - Admin user schema and methods
- **`openaiTokenUsage.ts`** - OpenAI token usage tracking schema
- **`user.ts`** - Regular user schema and methods

### **Routes (`/src/routes`)**
- **`adminAudit.ts`** - Admin audit log endpoints
- **`adminUsers.ts`** - Admin user management endpoints
- **`auth.ts`** - Authentication endpoints (login, signup, logout)
- **`openaiAdmin.ts`** - OpenAI management endpoints
- **`profile.ts`** - User profile management
- **`testGeneration.ts`** - Test case generation endpoints
- **`user.ts`** - User management endpoints

### **Scripts (`/src/scripts`)**
- **`migrateAdmins.ts`** - Admin user migration utilities
- **`setupAdmin.ts`** - Initial admin user setup
- **`setupDatabase.ts`** - Database initialization

### **Services (`/src/services`)**
- **`adminAuditService.ts`** - Admin audit business logic
- **`adminUserService.ts`** - Admin user business logic
- **`openaiService.ts`** - OpenAI API integration
- **`testGenerationService.ts`** - Test case generation business logic

### **Types (`/src/types`)**
- **`contextWindow.ts`** - Context window type definitions
- **`index.ts`** - Common type definitions

### **Utils (`/src/utils`)**
- **`adminUserManager.ts`** - Admin user management utilities
- **`errorMessages.ts`** - Centralized error messages
- **`logger.ts`** - Logging utilities
- **`loginValidation.ts`** - Login form validation
- **`passwordValidation.ts`** - Password strength validation
- **`sessionUtils.ts`** - Session management utilities
- **`signUpValidation.ts`** - Registration form validation
- **`tokenUtils.ts`** - JWT token utilities

## 🎨 Frontend Structure (`/frontend`)

### **Core Application Files**
- **`src/App.tsx`** - Main React application component
- **`src/App.css`** - Global application styles
- **`src/index.tsx`** - React application entry point
- **`src/index.css`** - Global CSS styles
- **`package.json`** - Frontend dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration

### **Components (`/src/components`)**
- **`AdminDashboard.tsx`** - Admin dashboard interface
- **`AdminLogin.tsx`** - Admin login form
- **`AdminUserManagement.tsx`** - Admin user management interface
- **`AuditLogs.tsx`** - Audit log viewer
- **`Dashboard.tsx`** - User dashboard
- **`FileUpload.tsx`** - File upload component
- **`Header.tsx`** - Application header
- **`Login.tsx`** - User login form
- **`Profile.tsx`** - User profile management
- **`Register.tsx`** - User registration form
- **`TestGeneration.tsx`** - Test case generation interface
- **`TestResults.tsx`** - Test results display
- **`UploadTestData.tsx`** - Test data upload interface
- **`UserManagement.tsx`** - User management interface
- **`Welcome.tsx`** - Welcome/landing page

### **Configuration (`/src/config`)**
- **`api.ts`** - API endpoint configurations

### **Contexts (`/src/contexts`)**
- **`AuthContext.tsx`** - Authentication context provider

### **Hooks (`/src/hooks`)**
- **`useNetworkStatus.ts`** - Network connectivity monitoring

### **Store (`/src/store`)**
- **`authStore.ts`** - Authentication state management
- **`testStore.ts`** - Test generation state management
- **`userStore.ts`** - User data state management

### **Types (`/src/types`)**
- **`index.ts`** - TypeScript type definitions

### **Utils (`/src/utils`)**
- **`api.ts`** - API utility functions
- **`auth.ts`** - Authentication utilities
- **`constants.ts`** - Application constants
- **`helpers.ts`** - General utility functions

## 📚 Documentation Files

### **Root Level Documentation**
- **`ADMIN_ACCESS_GUIDE.md`** - Complete guide for admin access and management
- **`OPENAI_TOKEN_USAGE_GUIDE.md`** - OpenAI API usage and monitoring guide
- **`SESSION_MANAGEMENT.md`** - Session management and security guide
- **`SWAGGER_API_DOCUMENTATION.md`** - Comprehensive API documentation
- **`TEST_CASE_GENERATION.md`** - Test case generation process guide
- **`apiList.md`** - API endpoint reference
- **`env.example`** - Environment variables template

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd perfectAI
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Configure your environment variables
   # See env.example for required variables
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   # Run database setup script
   cd backend
   npm run setup-db
   ```

5. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

## 🔗 API Endpoints

### **Authentication**
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### **Test Generation**
- `GET /api/test-generation/test` - API health check
- `POST /api/test-generation/generate` - Generate test cases
- `POST /api/test-generation/generate-streaming` - Streaming test generation

### **Admin Management**
- `GET /admin/users/list` - List admin users
- `POST /admin/users/create-admin` - Create admin user
- `GET /admin/audit/logs` - Get audit logs

### **API Documentation**
- `GET /api-docs` - Swagger UI documentation
- `GET /api-docs.json` - OpenAPI specification

## 🛠️ Development Scripts

### **Backend Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run setup-db     # Setup database
```

### **Frontend Scripts**
```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Admin and user role separation
- **Audit Logging** - Complete admin action tracking
- **Rate Limiting** - API request rate limiting
- **Input Validation** - Comprehensive request validation
- **Session Management** - Secure session handling

## 📊 Monitoring & Analytics

- **OpenAI Token Tracking** - Monitor AI API usage
- **Admin Audit Logs** - Track all admin actions
- **Request Logging** - Comprehensive API logging
- **Error Tracking** - Centralized error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation files in the root directory
- Review the API documentation at `/api-docs`
- Contact the development team

---

**PerfectAI** - Empowering developers with AI-driven test case generation 🚀
