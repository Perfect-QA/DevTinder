import express from 'express';
import { userAuth } from '../middlewares/authmiddleware';
import { apiLimiter } from '../middlewares/rateLimiting';
import {
  generateTestCases,
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
router.post('/generate', generateTestCases);

// File content management routes
router.post('/file-content', storeFileContent);
router.get('/file-content/:fileId', getFileContent);
router.delete('/file-content', clearFileContent);
router.get('/file-content-stats', getFileContentStats);

export default router;
