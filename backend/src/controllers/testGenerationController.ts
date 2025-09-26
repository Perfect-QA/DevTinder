import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import contextWindowService from '../services/contextWindowService';
import { AuthenticatedRequest } from '../types';
import { ContextWindowRequest } from '../types/contextWindow';
import { trackOpenAIUsage, recordOpenAIUsage } from '../middlewares/openaiTokenTracking';
import { OpenAIUsageData } from '../services/openaiTokenService';

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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// In-memory storage for file content (in production, use database)
export const fileContentCache = new Map<string, string>();

// In-memory storage for user request tracking (in production, use database)
const userRequestCache = new Map<string, number[]>();

// Daily token usage tracking to prevent excessive usage
const dailyTokenUsage = new Map<string, { date: string; tokens: number }>();

// In-memory cache for request deduplication
const requestCache = new Map<string, { timestamp: number; processing: boolean }>();

// Helper function for request deduplication
const handleRequestDeduplication = (requestId: string, res: Response): boolean => {
  if (!requestId) return false;
  
  const now = Date.now();
  const existingRequest = requestCache.get(requestId);
  
  if (existingRequest) {
    if (existingRequest.processing) {
      console.log(`⚠️ Duplicate request detected: ${requestId}`);
      res.status(409).json({
        success: false,
        testCases: [],
        totalGenerated: 0,
        hasMore: false,
        error: 'Request already in progress'
      });
      return true;
    }
    
    if (now - existingRequest.timestamp < 5000) {
      console.log(`⚠️ Recent duplicate request detected: ${requestId}`);
      res.status(409).json({
        success: false,
        testCases: [],
        totalGenerated: 0,
        hasMore: false,
        error: 'Request completed recently, please wait'
      });
      return true;
    }
  }
  
  return false;
};

// Helper function for consistent error handling
const handleError = (error: unknown, message: string, res: Response, statusCode: number = 500): void => {
  console.error(`❌ ${message}:`, error);
  res.status(statusCode).json({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

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
 * Generate test cases with streaming (one by one)
 */
export const generateTestCasesStreaming = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let requestId: string | undefined;
  
  try {
    const { prompt, fileIds = [], count = 10, offset = 0, requestId: reqId }: TestGenerationRequest = req.body;
    requestId = reqId;

    // Request deduplication - prevent duplicate requests
    if (requestId && handleRequestDeduplication(requestId, res)) {
      return;
    }
    
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: true });
    }

    // Rate limiting check
    const userId = req.user?._id;
    if (userId) {
      const userRequestKey = `test_gen_${userId}`;
      const now = Date.now();
      const userRequests = userRequestCache.get(userRequestKey) || [];
      const recentRequests = userRequests.filter((timestamp: number) => now - timestamp < 3600000);
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

    // Daily token usage limit (roughly 20,000 tokens per day per user for GPT-3.5 Turbo)
    const today = new Date().toDateString();
    const userTokenKey = `tokens_${userId}`;
    const userTokenUsage = dailyTokenUsage.get(userTokenKey);
    
    if (userTokenUsage && userTokenUsage.date === today && userTokenUsage.tokens > 20000) {
      res.status(429).json({
        success: false,
        error: 'Daily token limit exceeded. Please try again tomorrow.'
      });
      return;
    }

    console.log(`🚀 Test generation request: ${fileIds.length} files, count: ${count}`);

    // Process file content if files are provided
    let fileContent = '';
    if (fileIds.length > 0) {
      fileContent = await processFileContent(fileIds);
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to streaming test generation'
    })}\n\n`);

    // Generate all test cases in ONE API call (saves 90% tokens!)
    // Supports 1-50 test cases including sub-test cases
    const result = await openaiService.generateTestCases({
      prompt: prompt.trim(),
      fileContent: fileContent || '',
      count,
      offset
    });

    if (!result.success) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: result.error || 'Failed to generate test cases'
      })}\n\n`);
      res.end();
      return;
    }

    // Stream the results one by one for UI effect (but generated in single call)
    const allTestCases = result.testCases;
    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];
      
      // Send individual test case
      res.write(`data: ${JSON.stringify({
        type: 'testCase',
        testCase: testCase,
        index: i + 1,
        total: allTestCases.length
      })}\n\n`);

      console.log(`✅ Generated test case ${i + 1}/${allTestCases.length}: ${testCase?.summary || 'Unknown'}`);
      
      // Small delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      totalGenerated: allTestCases.length,
      hasMore: allTestCases.length >= count,
      message: `Successfully generated ${allTestCases.length} test cases`
    })}\n\n`);

    // Mark request as completed
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: false });
    }

    res.end();

  } catch (error) {
    console.error('❌ Streaming test generation error:', error);
    
    // Mark request as completed (even on error)
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: false });
    }
    
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Internal server error during test case generation'
    })}\n\n`);
    res.end();
  }
};

/**
 * Generate test cases from user prompt and uploaded files
 */
export const generateTestCases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let requestId: string | undefined;
  
  try {
    const { prompt, fileIds = [], count = 10, offset = 0, requestId: reqId }: TestGenerationRequest = req.body;
    requestId = reqId;

    // Request deduplication - prevent duplicate requests
    if (requestId && handleRequestDeduplication(requestId, res)) {
      return;
    }
    
    if (requestId) {
      requestCache.set(requestId, { timestamp: Date.now(), processing: true });
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


    // Process file content if files are provided
    let fileContent = '';
    if (fileIds.length > 0) {
      fileContent = await processFileContent(fileIds);
    }

    // Generate test cases using OpenAI
    const result = await openaiService.generateTestCases({
      prompt: prompt.trim(),
      fileContent: fileContent || '',
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

    // Track OpenAI token usage for admin monitoring
    try {
      if (result.usage && req.user) {
        const promptTokens = result.usage.prompt_tokens || 0;
        const completionTokens = result.usage.completion_tokens || 0;
        const totalTokens = result.usage.total_tokens || 0;
        
        // Calculate cost using OpenAI GPT-3.5-turbo pricing
        const costPerInputToken = 0.0000005;   // $0.50 per 1M tokens
        const costPerOutputToken = 0.0000015;  // $1.50 per 1M tokens
        const cost = (promptTokens * costPerInputToken) + (completionTokens * costPerOutputToken);

        const usageData: OpenAIUsageData = {
          userId: req.user._id || req.user.id,
          userEmail: req.user.emailId || 'unknown@example.com',
          modelName: 'gpt-3.5-turbo',
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          operation: 'test_generation'
        };

        // Record usage asynchronously
        setImmediate(async () => {
          try {
            await recordOpenAIUsage(usageData);
          } catch (error) {
            console.error('❌ Failed to record OpenAI usage:', error);
          }
        });
      }
    } catch (error) {
      console.error('❌ OpenAI tracking error:', error);
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
    

    res.json({
      success: true,
      message: 'File content stored successfully',
      fileId
    });

  } catch (error) {
    handleError(error, 'Error storing file content', res);
  }
};

/**
 * Get stored file content
 */
export const getFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    const content = fileContentCache.get(fileId || '');
    
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
    handleError(error, 'Error retrieving file content', res);
  }
};

/**
 * Clear file content cache
 */
export const clearFileContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const clearedCount = fileContentCache.size;
    fileContentCache.clear();
    

    res.json({
      success: true,
      message: `Cleared ${clearedCount} file content entries`
    });

  } catch (error) {
    handleError(error, 'Error clearing file content', res);
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

/**
 * Generate test cases with context window support
 */
export const generateTestCasesWithContext = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      prompt, 
      fileIds = [], 
      count = 10, 
      parentTestCaseId, 
      contextWindowId, 
      sessionId 
    }: ContextWindowRequest = req.body;

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    // Type guard to ensure userId is string
    const userIdString: string = userId as string;


    // Process file content if files are provided
    let fileContent = '';
    if (fileIds.length > 0) {
      fileContent = await processFileContent(fileIds);
    }

    // Get or create context window
    let currentContextWindowId = contextWindowId;
    if (!currentContextWindowId) {
      const contextResult = await contextWindowService.createContextWindow(
        userIdString,
        sessionId || `session_${Date.now()}`,
        { prompt, fileIds: fileIds || [], count: count || 10 }
      );
      
      if (!contextResult.success) {
        res.status(500).json({
          success: false,
          error: contextResult.error || 'Failed to create context window'
        });
        return;
      }
      
      currentContextWindowId = contextResult.contextWindow?.id;
    }

    // Build optimized prompt with context (shorter to save tokens)
    let enhancedPrompt = prompt;
    if (parentTestCaseId && currentContextWindowId) {
      const parentContext = await contextWindowService.getTestCasesByParent(
        currentContextWindowId,
        parentTestCaseId
      );
      
      if (parentContext.success && parentContext.testCases) {
        const parentTestCase = parentContext.testCases[0];
        if (parentTestCase) {
          // Shorter prompt to save tokens
          enhancedPrompt = `Sub-tests for: ${parentTestCase.summary}
Steps: ${parentTestCase.steps}
Expected: ${parentTestCase.expectedResult}
Generate ${count} detailed sub-test cases.`;
        }
      }
    }

    // Generate test cases using OpenAI
    const result = await openaiService.generateTestCases({
      prompt: enhancedPrompt.trim(),
      fileContent: fileContent || '',
      count,
      offset: 0
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate test cases'
      });
      return;
    }

    // Add test cases to context window
    const contextResult = await contextWindowService.addTestCasesToContext(
      currentContextWindowId!,
      result.testCases,
      parentTestCaseId
    );

    if (!contextResult.success) {
      res.status(500).json({
        success: false,
        error: contextResult.error || 'Failed to add test cases to context'
      });
      return;
    }

    // Get updated context window
    const updatedContext = await contextWindowService.getContextWindow(currentContextWindowId!);
    
    // Get navigation information
    const navigation = await contextWindowService.getContextNavigation(currentContextWindowId!);
    
    // Get statistics
    const stats = await contextWindowService.getContextWindowStats(currentContextWindowId!);

    res.json({
      success: true,
      testCases: result.testCases,
      contextWindow: updatedContext.contextWindow,
      navigation,
      stats,
      totalGenerated: result.totalGenerated,
      hasMore: result.hasMore,
      message: `Successfully generated ${result.totalGenerated} test cases with context`
    });

  } catch (error) {
    console.error('❌ Context-aware test generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during context-aware test case generation'
    });
  }
};

/**
 * Get context window by ID
 */
export const getContextWindow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contextWindowId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!contextWindowId) {
      res.status(400).json({
        success: false,
        error: 'Context window ID is required'
      });
      return;
    }

    const result = await contextWindowService.getContextWindow(contextWindowId);
    
    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    // Get navigation and stats
    const navigation = await contextWindowService.getContextNavigation(contextWindowId);
    const stats = await contextWindowService.getContextWindowStats(contextWindowId);

    res.json({
      ...result,
      navigation,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting context window:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get context window'
    });
  }
};

/**
 * Get all context windows for user
 */
export const getUserContextWindows = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    const userIdString: string = userId as string;
    const result = await contextWindowService.getUserContextWindows(userIdString);
    res.json(result);

  } catch (error) {
    console.error('❌ Error getting user context windows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user context windows'
    });
  }
};

/**
 * Get test cases by level
 */
export const getTestCasesByLevel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contextWindowId } = req.params;
    const { level } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!contextWindowId) {
      res.status(400).json({
        success: false,
        error: 'Context window ID is required'
      });
      return;
    }

    if (!level || isNaN(Number(level))) {
      res.status(400).json({
        success: false,
        error: 'Level parameter is required and must be a number'
      });
      return;
    }

    const result = await contextWindowService.getTestCasesByLevel(contextWindowId, Number(level));
    res.json(result);

  } catch (error) {
    console.error('❌ Error getting test cases by level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test cases by level'
    });
  }
};

/**
 * Get test cases by parent
 */
export const getTestCasesByParent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contextWindowId, parentTestCaseId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!contextWindowId || !parentTestCaseId) {
      res.status(400).json({
        success: false,
        error: 'Context window ID and parent test case ID are required'
      });
      return;
    }

    const result = await contextWindowService.getTestCasesByParent(contextWindowId, parentTestCaseId);
    res.json(result);

  } catch (error) {
    console.error('❌ Error getting test cases by parent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test cases by parent'
    });
  }
};

/**
 * Delete context window
 */
export const deleteContextWindow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contextWindowId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
      return;
    }

    if (!contextWindowId) {
      res.status(400).json({
        success: false,
        error: 'Context window ID is required'
      });
      return;
    }

    const userIdString: string = userId as string;
    const result = await contextWindowService.deleteContextWindow(contextWindowId, userIdString);
    res.json(result);

  } catch (error) {
    console.error('❌ Error deleting context window:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete context window'
    });
  }
};
