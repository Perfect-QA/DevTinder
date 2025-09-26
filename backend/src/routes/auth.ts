import express, { Request, Response } from 'express';
import { userAuth } from "../middlewares/authmiddleware";

const authRouter = express.Router();

// Import controllers
import { signup } from '../controllers/auth/signupController';
import { login } from '../controllers/auth/loginController';
import { logout } from '../controllers/auth/logoutController';
import { refreshToken } from '../controllers/auth/refreshTokenController';
import { getActiveSessions, removeSession, removeAllSessions, getSessionStats, updateSessionActivity } from '../controllers/auth/sessionController';
import { getDashboard, getUserInfo } from '../controllers/auth/dashboardController';
import { triggerCleanup, getCleanupStats, getSessionStats as getGlobalSessionStats, cleanupUserSessions } from '../controllers/auth/cleanupController';
import { 
  googleAuth, 
  googleCallback, 
  unlinkGoogleAccount, 
  getGoogleProfile,
  githubAuth,
  githubCallback,
  unlinkGithubAccount,
  getGithubProfile,
  getGithubRepositories,
  unlinkAccount,
  getOAuthStatus
} from '../controllers/oauthController';


// ==================== AUTHENTICATION ROUTES ====================

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - emailId
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               emailId:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
// Signup route
authRouter.post("/signup", signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailId
 *               - password
 *             properties:
 *               emailId:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
// Login route
authRouter.post("/login", login);

// Logout route
authRouter.post("/logout", userAuth, logout);

// Dashboard route
authRouter.get("/dashboard", userAuth, getDashboard);

// Get user info route
authRouter.get("/user", userAuth, getUserInfo);
authRouter.get("/user-info", userAuth, getUserInfo); // Alias for user-info

// Refresh token route
authRouter.post("/refresh", refreshToken);

// Session management routes
authRouter.get("/sessions", userAuth, getActiveSessions);
authRouter.delete("/sessions/:sessionId", userAuth, removeSession);
authRouter.delete("/sessions", userAuth, removeAllSessions);
authRouter.get("/sessions/stats", userAuth, getSessionStats);
authRouter.post("/sessions/activity", userAuth, updateSessionActivity);

// Session cleanup routes
authRouter.post("/sessions/cleanup", userAuth, cleanupUserSessions);
authRouter.post("/cleanup/trigger", userAuth, triggerCleanup);
authRouter.get("/cleanup/stats", userAuth, getCleanupStats);
authRouter.get("/cleanup/session-stats", userAuth, getGlobalSessionStats);

// ==================== OAUTH ROUTES ====================

// Google OAuth routes
authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback);
authRouter.post("/google/unlink", userAuth, unlinkGoogleAccount);
authRouter.get("/google/profile", userAuth, getGoogleProfile);

// GitHub OAuth routes
authRouter.get("/github", githubAuth);
authRouter.get("/github/callback", githubCallback);
authRouter.post("/github/unlink", userAuth, unlinkGithubAccount);
authRouter.get("/github/profile", userAuth, getGithubProfile);
authRouter.get("/github/repositories", userAuth, getGithubRepositories);

// General OAuth routes
authRouter.post("/unlink-account", userAuth, unlinkAccount);
authRouter.get("/oauth-status", userAuth, getOAuthStatus);

export default authRouter;
