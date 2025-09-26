import express from 'express';
import { userAuth } from '../middlewares/authmiddleware';
import { apiLimiter } from '../middlewares/rateLimiting';
import {
  generateTestCases,
  generateTestCasesStreaming,
  generateTestCasesWithContext,
  getContextWindow,
  getUserContextWindows,
  getTestCasesByLevel,
  getTestCasesByParent,
  deleteContextWindow,
  storeFileContent,
  getFileContent,
  clearFileContent,
  getFileContentStats
} from '../controllers/testGenerationController';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test generation API is working' });
});

// Test case generation routes (authentication optional for testing)
router.post('/generate', generateTestCases as any);
router.post('/generate-streaming', generateTestCasesStreaming as any);

// Context window routes (require authentication)
router.post('/generate-with-context', userAuth, generateTestCasesWithContext as any);
router.get('/context-windows', userAuth, getUserContextWindows as any);
router.get('/context-window/:contextWindowId', userAuth, getContextWindow as any);
router.get('/context-window/:contextWindowId/level/:level', userAuth, getTestCasesByLevel as any);
router.get('/context-window/:contextWindowId/parent/:parentTestCaseId', userAuth, getTestCasesByParent as any);
router.delete('/context-window/:contextWindowId', userAuth, deleteContextWindow as any);

// File content management routes
router.post('/file-content', storeFileContent);
router.get('/file-content/:fileId', getFileContent);
router.delete('/file-content', clearFileContent);
router.get('/file-content-stats', getFileContentStats);

export default router;
