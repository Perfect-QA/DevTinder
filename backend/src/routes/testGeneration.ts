import express from 'express';
import { userAuth } from '../middlewares/authmiddleware';
import { apiLimiter } from '../middlewares/rateLimiting';
import {
  generateTestCases,
  generateTestCasesStreaming,
  generateTestCasesWithContext,
  getContextWindow,
  getUserContextWindows,
  getTestCasesByParent,
  deleteContextWindow,
  storeFileContent,
  getFileContent,
  clearFileContent,
  getFileContentStats
} from '../controllers/testGenerationController';

const router = express.Router();

/**
 * @swagger
 * /api/test-generation/test:
 *   get:
 *     summary: Test endpoint to verify API is working
 *     tags: [Test Generation]
 *     responses:
 *       200:
 *         description: API is working
 */
// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test generation API is working' });
});

/**
 * @swagger
 * /api/test-generation/generate:
 *   post:
 *     summary: Generate test cases from uploaded files
 *     tags: [Test Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     content:
 *                       type: string
 *               count:
 *                 type: integer
 *                 default: 5
 *               prompt:
 *                 type: string
 *                 description: Custom prompt for test case generation
 *     responses:
 *       200:
 *         description: Test cases generated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Generation failed
 */
// Test case generation routes (authentication optional for testing)
router.post('/generate', generateTestCases as any);

/**
 * @swagger
 * /api/test-generation/generate-streaming:
 *   post:
 *     summary: Generate test cases with streaming response
 *     tags: [Test Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     content:
 *                       type: string
 *               count:
 *                 type: integer
 *                 default: 5
 *               prompt:
 *                 type: string
 *                 description: Custom prompt for test case generation
 *     responses:
 *       200:
 *         description: Streaming test case generation
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post('/generate-streaming', generateTestCasesStreaming as any);

// Context window routes (require authentication)
router.post('/generate-with-context', userAuth, generateTestCasesWithContext as any);
router.get('/context-windows', userAuth, getUserContextWindows as any);
router.get('/context-window/:contextWindowId', userAuth, getContextWindow as any);
router.get('/context-window/:contextWindowId/parent/:parentTestCaseId', userAuth, getTestCasesByParent as any);
router.delete('/context-window/:contextWindowId', userAuth, deleteContextWindow as any);

// File content management routes
router.post('/file-content', storeFileContent);
router.get('/file-content/:fileId', getFileContent);
router.delete('/file-content', clearFileContent);
router.get('/file-content-stats', getFileContentStats);

export default router;
