import React, { useState } from 'react';
import ContextWindowManager from './ContextWindowManager';
import { TestCaseContext } from '../types';

const ContextWindowDemo: React.FC = () => {
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseContext | null>(null);
  const [showContextManager, setShowContextManager] = useState(false);

  const handleTestCaseSelect = (testCase: TestCaseContext) => {
    setSelectedTestCase(testCase);
  };

  const handleGenerateSubTests = async (parentTestCaseId: string, count: number) => {
    // This would be handled by the ContextWindowManager component
    console.log(`Generating ${count} sub-tests for parent: ${parentTestCaseId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-900">
                Context Window Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Generate test cases with hierarchical context management. 
                Create initial test cases, then generate sub-test cases from any parent test case.
              </p>
            </div>

            <div className="p-6">
              {/* Demo Instructions */}
              <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                  <li>Generate 10 initial test cases using the normal test generation</li>
                  <li>Select any test case (e.g., the 3rd one) to generate 10 sub-test cases</li>
                  <li>From those sub-test cases, select one to generate 10 sub-sub-test cases</li>
                  <li>Navigate between levels using the context window manager</li>
                </ol>
              </div>

              {/* Toggle Context Manager */}
              <div className="mb-6">
                <button
                  onClick={() => setShowContextManager(!showContextManager)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showContextManager ? 'Hide' : 'Show'} Context Window Manager
                </button>
              </div>

              {/* Context Window Manager */}
              {showContextManager && (
                <div className="mb-8">
                  <ContextWindowManager
                    onTestCaseSelect={handleTestCaseSelect}
                    onGenerateSubTests={handleGenerateSubTests}
                  />
                </div>
              )}

              {/* Selected Test Case Details */}
              {selectedTestCase && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Selected Test Case</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Summary:</span>
                      <p className="text-gray-900">{selectedTestCase.summary}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Precondition:</span>
                      <p className="text-gray-900">{selectedTestCase.precondition}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Steps:</span>
                      <p className="text-gray-900 whitespace-pre-line">{selectedTestCase.steps}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Expected Result:</span>
                      <p className="text-gray-900">{selectedTestCase.expectedResult}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="font-medium text-gray-700">Priority:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedTestCase.priority === 'P1' ? 'bg-red-100 text-red-800' :
                        selectedTestCase.priority === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedTestCase.priority}
                      </span>
                      
                      <span className="font-medium text-gray-700">Level:</span>
                      <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                        {selectedTestCase.level}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Example */}
              <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Example Usage Flow:</h3>
                <div className="text-green-800 text-sm space-y-2">
                  <p><strong>Step 1:</strong> Generate 10 initial test cases for "User Login Functionality"</p>
                  <p><strong>Step 2:</strong> Select test case #3 "Test invalid password scenarios"</p>
                  <p><strong>Step 3:</strong> Generate 10 sub-test cases from test case #3</p>
                  <p><strong>Step 4:</strong> Select one of the sub-test cases (e.g., "Test empty password")</p>
                  <p><strong>Step 5:</strong> Generate 10 sub-sub-test cases for detailed edge cases</p>
                  <p><strong>Result:</strong> You now have a hierarchical structure: 10 → 10 → 10 test cases with full context</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextWindowDemo;
