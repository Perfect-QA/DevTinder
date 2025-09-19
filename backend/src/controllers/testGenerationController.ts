import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { AuthenticatedRequest } from '../types';

interface TestGenerationRequest {
  prompt: string;
  fileIds?: string[];
  count?: number;
  offset?: number;
  requestId?: string;
}

interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
}

interface TestGenerationResponse {
  success: boolean;
  testCases: TestCase[];
  totalGenerated: number;
  hasMore: boolean;
  message?: string;
  error?: string;
}

// In-memory storage for file content (in production, use database)
const fileContentCache = new Map<string, string>();

// In-memory storage for user request tracking (in production, use database)
const userRequestCache = new Map<string, number[]>();

// In-memory cache for request deduplication
const requestCache = new Map<string, { timestamp: number; processing: boolean }>();

// Cleanup old requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [requestId, data] of requestCache.entries()) {
    if (data.timestamp < fiveMinutesAgo && !data.processing) {
      requestCache.delete(requestId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate test cases from user prompt and uploaded files
 */
export const generateTestCases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let requestId: string | undefined;
  
  try {
    const { prompt, fileIds = [], count = 10, offset = 0, requestId: reqId }: TestGenerationRequest = req.body;
    requestId = reqId;

    // Request deduplication - prevent duplicate requests
    if (requestId) {
      const now = Date.now();
      const existingRequest = requestCache.get(requestId);
      
      if (existingRequest) {
        // If request is still processing, return error
        if (existingRequest.processing) {
          console.log(`⚠️ Duplicate request detected: ${requestId}`);
          res.status(409).json({
            success: false,
            testCases: [],
            totalGenerated: 0,
            hasMore: false,
            error: 'Request already in progress'
          });
          return;
        }
        
        // If request was completed recently (within 5 seconds), return cached result
        if (now - existingRequest.timestamp < 5000) {
          console.log(`⚠️ Recent duplicate request detected: ${requestId}`);
          res.status(409).json({
            success: false,
            testCases: [],
            totalGenerated: 0,
            hasMore: false,
            error: 'Request completed recently, please wait'
          });
          return;
        }
      }
      
      // Mark request as processing
      requestCache.set(requestId, { timestamp: now, processing: true });
    }

    // Rate limiting check - prevent too many requests from same user
    const userId = req.user?._id;
    if (userId) {
      const userRequestKey = `test_gen_${userId}`;
      const now = Date.now();
      const userRequests = userRequestCache.get(userRequestKey) || [];
      
      // Remove requests older than 1 hour
      const recentRequests = userRequests.filter((timestamp: number) => now - timestamp < 3600000);
      
      // Add current request
      recentRequests.push(now);
      userRequestCache.set(userRequestKey, recentRequests);
    }

    if (!prompt || prompt.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Prompt is required for test case generation'
      });
      return;
    }

    if (count < 1 || count > 50) {
      res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 50'
      });
      return;
    }

    console.log('🚀 Test generation request received');
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`📁 Files: ${fileIds.length}`);
    console.log(`📊 Count: ${count}, Offset: ${offset}`);

    // Process file content if files are provided
    let fileContent = '';
    if (fileIds.length > 0) {
      fileContent = await processFileContent(fileIds);
    }

    // Generate test cases using OpenAI
    const result = await openaiService.generateTestCases({
      prompt: prompt.trim(),
      fileContent: fileContent || undefined,
      count,
      offset
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate test cases'
      });
      return;
    }

    // Sort test cases by priority (P1 first, then P2, then P3)
    const sortedTestCases = result.testCases.sort((a, b) => {
      const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const response: TestGenerationResponse = {
      success: true,
      testCases: sortedTestCases,
      totalGenerated: result.totalGenerated,
      hasMore: result.hasMore,
      message: `Successfully generated ${result.totalGenerated} test cases`
    };

    // Mark request as completed
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: false });
    }
    
    res.json(response);

  } catch (error) {
    console.error('❌ Test generation error:', error);
    
    // Mark request as completed (even on error)
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: false });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during test case generation'
    });
  }
};

/**
 * Process file content from uploaded files
 */
async function processFileContent(fileIds: string[]): Promise<string> {
  let combinedContent = '';
  
  for (const fileId of fileIds) {
    try {
      // Get file content from cache (in production, retrieve from database)
      const content = fileContentCache.get(fileId);
      if (content) {
        combinedContent += `\n\n--- File: ${fileId} ---\n${content}`;
      } else {
        console.warn(`⚠️ File content not found for ID: ${fileId}`);
      }
    } catch (error) {
      console.error(`❌ Error processing file ${fileId}:`, error);
    }
  }
  
  return combinedContent.trim();
}

/**
 * Store file content for test generation
 */
export const storeFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, content, fileName, mimeType } = req.body;

    if (!fileId || !content) {
      res.status(400).json({
        success: false,
        error: 'File ID and content are required'
      });
      return;
    }

    // Store content in cache
    fileContentCache.set(fileId, content);
    
    console.log(`💾 File content stored for ID: ${fileId}`);

    res.json({
      success: true,
      message: 'File content stored successfully',
      fileId
    });

  } catch (error) {
    console.error('❌ Error storing file content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store file content'
    });
  }
};

/**
 * Get stored file content
 */
export const getFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    const content = fileContentCache.get(fileId);
    
    if (!content) {
      res.status(404).json({
        success: false,
        error: 'File content not found'
      });
      return;
    }

    res.json({
      success: true,
      content,
      fileId
    });

  } catch (error) {
    console.error('❌ Error retrieving file content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file content'
    });
  }
};

/**
 * Clear file content cache
 */
export const clearFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const clearedCount = fileContentCache.size;
    fileContentCache.clear();
    
    console.log(`🗑️ Cleared ${clearedCount} file content entries`);

    res.json({
      success: true,
      message: `Cleared ${clearedCount} file content entries`
    });

  } catch (error) {
    console.error('❌ Error clearing file content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear file content'
    });
  }
};

/**
 * Get file content cache statistics
 */
export const getFileContentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = {
      totalFiles: fileContentCache.size,
      fileIds: Array.from(fileContentCache.keys())
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting file content stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file content statistics'
    });
  }
};
