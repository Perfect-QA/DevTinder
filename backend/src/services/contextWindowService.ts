import { v4 as uuidv4 } from 'uuid';
import { 
  ContextWindow, 
  TestCaseContext, 
  ContextWindowRequest, 
  ContextWindowResponse,
  ContextNavigation,
  ContextWindowStats
} from '../types/contextWindow';
// Define TestCase interface locally to avoid circular dependency
interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
}

class ContextWindowService {
  private contextWindows: Map<string, ContextWindow> = new Map();
  private userSessions: Map<string, string[]> = new Map(); // userId -> contextWindowIds

  /**
   * Create a new context window
   */
  async createContextWindow(
    userId: string,
    sessionId: string,
    request: ContextWindowRequest
  ): Promise<ContextWindowResponse> {
    try {
      const contextWindowId = uuidv4();
      const contextWindow: ContextWindow = {
        id: contextWindowId,
        userId,
        sessionId,
        name: 'Test Session ' + new Date().toLocaleDateString(),
        description: 'Generated from: ' + request.prompt.substring(0, 100) + '...',
        rootPrompt: request.prompt,
        fileIds: request.fileIds || [],
        testCases: [],
        currentLevel: 0,
        maxLevel: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.contextWindows.set(contextWindowId, contextWindow);
      
      // Track user sessions
      const userSessions = this.userSessions.get(userId) || [];
      userSessions.push(contextWindowId);
      this.userSessions.set(userId, userSessions);

      return {
        success: true,
        contextWindow,
        message: 'Context window created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating context window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create context window'
      };
    }
  }

  /**
   * Get context window by ID
   */
  async getContextWindow(contextWindowId: string): Promise<ContextWindowResponse> {
    try {
      const contextWindow = this.contextWindows.get(contextWindowId);
      
      if (!contextWindow) {
        return {
          success: false,
          error: 'Context window not found'
        };
      }

      return {
        success: true,
        contextWindow,
        message: 'Context window retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error getting context window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get context window'
      };
    }
  }

  /**
   * Get all context windows for a user
   */
  async getUserContextWindows(userId: string): Promise<ContextWindowResponse> {
    try {
      const userSessionIds = this.userSessions.get(userId) || [];
      const userContextWindows = userSessionIds
        .map(id => this.contextWindows.get(id))
        .filter((window): window is ContextWindow => window !== undefined)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        contextWindow: userContextWindows as any, // Type assertion for array
        message: 'Found ' + userContextWindows.length + ' context windows'
      };
    } catch (error) {
      console.error('❌ Error getting user context windows:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user context windows'
      };
    }
  }

  /**
   * Add test cases to context window
   */
  async addTestCasesToContext(
    contextWindowId: string,
    testCases: TestCase[],
    parentTestCaseId?: string
  ): Promise<ContextWindowResponse> {
    try {
      const contextWindow = this.contextWindows.get(contextWindowId);
      
      if (!contextWindow) {
        return {
          success: false,
          error: 'Context window not found'
        };
      }

      // Convert TestCase to TestCaseContext
      const contextTestCases: TestCaseContext[] = testCases.map(testCase => ({
        id: uuidv4(),
        summary: testCase.summary,
        precondition: testCase.precondition,
        steps: testCase.steps,
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
        parentId: parentTestCaseId,
        level: parentTestCaseId ? this.getTestCaseLevel(contextWindow, parentTestCaseId) + 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Add test cases to context window
      contextWindow.testCases.push(...contextTestCases);
      
      // Update level information
      const maxLevel = Math.max(...contextTestCases.map(tc => tc.level));
      contextWindow.maxLevel = Math.max(contextWindow.maxLevel, maxLevel);
      contextWindow.currentLevel = maxLevel;
      contextWindow.updatedAt = new Date();

      return {
        success: true,
        contextWindow,
        testCases: contextTestCases,
        message: 'Added ' + contextTestCases.length + ' test cases to context window'
      };
    } catch (error) {
      console.error('❌ Error adding test cases to context:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add test cases to context'
      };
    }
  }

  /**
   * Get test cases for a specific level
   */
  async getTestCasesByLevel(
    contextWindowId: string,
    level: number
  ): Promise<ContextWindowResponse> {
    try {
      const contextWindow = this.contextWindows.get(contextWindowId);
      
      if (!contextWindow) {
        return {
          success: false,
          error: 'Context window not found'
        };
      }

      const testCasesAtLevel = contextWindow.testCases.filter(tc => tc.level === level);

      return {
        success: true,
        testCases: testCasesAtLevel,
        message: 'Found ' + testCasesAtLevel.length + ' test cases at level ' + level
      };
    } catch (error) {
      console.error('❌ Error getting test cases by level:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get test cases by level'
      };
    }
  }

  /**
   * Get test cases for a specific parent
   */
  async getTestCasesByParent(
    contextWindowId: string,
    parentTestCaseId: string
  ): Promise<ContextWindowResponse> {
    try {
      const contextWindow = this.contextWindows.get(contextWindowId);
      
      if (!contextWindow) {
        return {
          success: false,
          error: 'Context window not found'
        };
      }

      const childTestCases = contextWindow.testCases.filter(tc => tc.parentId === parentTestCaseId);

      return {
        success: true,
        testCases: childTestCases,
        message: 'Found ' + childTestCases.length + ' child test cases'
      };
    } catch (error) {
      console.error('❌ Error getting test cases by parent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get test cases by parent'
      };
    }
  }

  /**
   * Get navigation information for context window
   */
  async getContextNavigation(contextWindowId: string): Promise<ContextNavigation> {
    const contextWindow = this.contextWindows.get(contextWindowId);
    
    if (!contextWindow) {
      throw new Error('Context window not found');
    }

    const breadcrumb = this.buildBreadcrumb(contextWindow);
    
    return {
      currentLevel: contextWindow.currentLevel,
      maxLevel: contextWindow.maxLevel,
      canGoBack: contextWindow.currentLevel > 0,
      canGoForward: contextWindow.currentLevel < contextWindow.maxLevel,
      breadcrumb
    };
  }

  /**
   * Get context window statistics
   */
  async getContextWindowStats(contextWindowId: string): Promise<ContextWindowStats> {
    const contextWindow = this.contextWindows.get(contextWindowId);
    
    if (!contextWindow) {
      throw new Error('Context window not found');
    }

    const testCasesByLevel: Record<number, number> = {};
    const testCasesByPriority: Record<string, number> = {};

    contextWindow.testCases.forEach(tc => {
      testCasesByLevel[tc.level] = (testCasesByLevel[tc.level] || 0) + 1;
      testCasesByPriority[tc.priority] = (testCasesByPriority[tc.priority] || 0) + 1;
    });

    const levelsCount = Object.keys(testCasesByLevel).length;
    const averageTestCasesPerLevel = contextWindow.testCases.length / levelsCount;

    return {
      totalTestCases: contextWindow.testCases.length,
      levelsCount,
      testCasesByLevel,
      testCasesByPriority,
      averageTestCasesPerLevel
    };
  }

  /**
   * Delete context window
   */
  async deleteContextWindow(contextWindowId: string, userId: string): Promise<ContextWindowResponse> {
    try {
      const contextWindow = this.contextWindows.get(contextWindowId);
      
      if (!contextWindow) {
        return {
          success: false,
          error: 'Context window not found'
        };
      }

      if (contextWindow.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to delete this context window'
        };
      }

      this.contextWindows.delete(contextWindowId);
      
      // Remove from user sessions
      const userSessions = this.userSessions.get(userId) || [];
      const updatedSessions = userSessions.filter(id => id !== contextWindowId);
      this.userSessions.set(userId, updatedSessions);

      return {
        success: true,
        message: 'Context window deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting context window:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete context window'
      };
    }
  }

  /**
   * Helper method to get test case level
   */
  private getTestCaseLevel(contextWindow: ContextWindow, testCaseId: string): number {
    const testCase = contextWindow.testCases.find(tc => tc.id === testCaseId);
    return testCase ? testCase.level : 0;
  }

  /**
   * Helper method to build breadcrumb navigation
   */
  private buildBreadcrumb(contextWindow: ContextWindow): Array<{
    level: number;
    testCaseId: string;
    summary: string;
  }> {
    const breadcrumb: Array<{
      level: number;
      testCaseId: string;
      summary: string;
    }> = [];

    // Find root level test cases
    const rootTestCases = contextWindow.testCases.filter(tc => tc.level === 0);
    
    // Build breadcrumb from current level
    const currentLevelTestCases = contextWindow.testCases.filter(tc => tc.level === contextWindow.currentLevel);
    
    currentLevelTestCases.forEach(tc => {
      breadcrumb.push({
        level: tc.level,
        testCaseId: tc.id,
        summary: tc.summary
      });
    });

    return breadcrumb;
  }

  /**
   * Clean up old context windows (older than 24 hours)
   */
  cleanupOldContextWindows(): void {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const [id, contextWindow] of this.contextWindows.entries()) {
      if (contextWindow.createdAt < twentyFourHoursAgo) {
        this.contextWindows.delete(id);
        
        // Remove from user sessions
        const userSessions = this.userSessions.get(contextWindow.userId) || [];
        const updatedSessions = userSessions.filter(sessionId => sessionId !== id);
        this.userSessions.set(contextWindow.userId, updatedSessions);
      }
    }
  }
}

export default new ContextWindowService();