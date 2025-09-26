import React, { useState, useEffect } from 'react';
import { TestCaseContext, ContextWindow, ContextNavigation } from '../types';

interface ContextWindowManagerProps {
  onTestCaseSelect: (testCase: TestCaseContext) => void;
  onGenerateSubTests: (parentTestCaseId: string, count: number) => void;
}

const ContextWindowManager: React.FC<ContextWindowManagerProps> = ({
  onTestCaseSelect,
  onGenerateSubTests
}) => {
  const [contextWindows, setContextWindows] = useState<ContextWindow[]>([]);
  const [currentContextWindow, setCurrentContextWindow] = useState<ContextWindow | null>(null);
  const [navigation, setNavigation] = useState<ContextNavigation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's context windows
  useEffect(() => {
    loadContextWindows();
  }, []);

  const loadContextWindows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-generation/context-windows', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load context windows');
      }
      
      const data = await response.json();
      if (data.success) {
        setContextWindows(data.contextWindow || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context windows');
    } finally {
      setLoading(false);
    }
  };

  const loadContextWindow = async (contextWindowId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/test-generation/context-window/${contextWindowId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load context window');
      }
      
      const data = await response.json();
      if (data.success) {
        setCurrentContextWindow(data.contextWindow);
        setNavigation(data.navigation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context window');
    } finally {
      setLoading(false);
    }
  };

  const generateSubTests = async (parentTestCaseId: string, count: number = 10) => {
    if (!currentContextWindow) return;

    try {
      setLoading(true);
      const response = await fetch('/api/test-generation/generate-with-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: `Generate ${count} sub-test cases`,
          contextWindowId: currentContextWindow.id,
          parentTestCaseId,
          count
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate sub-test cases');
      }

      const data = await response.json();
      if (data.success) {
        // Reload the context window to get updated data
        await loadContextWindow(currentContextWindow.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sub-test cases');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLevel = (level: number) => {
    if (!currentContextWindow) return;
    
    const testCasesAtLevel = currentContextWindow.testCases.filter(tc => tc.level === level);
    if (testCasesAtLevel.length > 0) {
      // Update current level in context window
      setCurrentContextWindow(prev => prev ? { ...prev, currentLevel: level } : null);
    }
  };

  const getTestCasesByLevel = (level: number) => {
    if (!currentContextWindow) return [];
    return currentContextWindow.testCases.filter(tc => tc.level === level);
  };

  const getTestCasesByParent = (parentId: string) => {
    if (!currentContextWindow) return [];
    return currentContextWindow.testCases.filter(tc => tc.parentId === parentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading context windows...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={() => setError(null)}
          className="mt-2 text-red-600 hover:text-red-800"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Context Windows List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Context Windows</h3>
        <div className="grid gap-4">
          {contextWindows.map((window) => (
            <div 
              key={window.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                currentContextWindow?.id === window.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => loadContextWindow(window.id)}
            >
              <div className="font-medium">{window.name}</div>
              <div className="text-sm text-gray-600">{window.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                {window.testCases.length} test cases • Level {window.currentLevel}/{window.maxLevel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Context Window */}
      {currentContextWindow && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {currentContextWindow.name}
          </h3>
          
          {/* Navigation */}
          {navigation && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-sm font-medium">
                  Level {navigation.currentLevel} of {navigation.maxLevel}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigateToLevel(navigation.currentLevel - 1)}
                    disabled={!navigation.canGoBack}
                    className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => navigateToLevel(navigation.currentLevel + 1)}
                    disabled={!navigation.canGoForward}
                    className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forward →
                  </button>
                </div>
              </div>
              
              {/* Breadcrumb */}
              <div className="text-sm text-gray-600">
                {navigation.breadcrumb.map((item, index) => (
                  <span key={item.testCaseId}>
                    {index > 0 && ' > '}
                    {item.summary.substring(0, 50)}...
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Test Cases by Level */}
          <div className="space-y-4">
            {Array.from({ length: currentContextWindow.maxLevel + 1 }, (_, level) => {
              const testCasesAtLevel = getTestCasesByLevel(level);
              if (testCasesAtLevel.length === 0) return null;

              return (
                <div key={level} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">
                    Level {level} ({testCasesAtLevel.length} test cases)
                  </h4>
                  
                  <div className="grid gap-3">
                    {testCasesAtLevel.map((testCase) => (
                      <div 
                        key={testCase.id}
                        className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => onTestCaseSelect(testCase)}
                      >
                        <div className="font-medium text-sm">{testCase.summary}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Priority: {testCase.priority} • Level: {testCase.level}
                        </div>
                        
                        {/* Generate Sub-tests Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateSubTests(testCase.id, 10);
                          }}
                          className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Generate 10 Sub-tests
                        </button>
                        
                        {/* Show child test cases if any */}
                        {getTestCasesByParent(testCase.id).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {getTestCasesByParent(testCase.id).length} sub-test cases
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextWindowManager;
