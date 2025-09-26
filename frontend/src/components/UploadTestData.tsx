import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  XMarkIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import ShimmerLoader from './ShimmerLoader';
import LoadingButton from './LoadingButton';
import { useTheme } from '../contexts/ThemeContext';
import { 
  UploadTestDataProps, 
  UploadedFile, 
  TestCase, 
  FileChangeHandler, 
  FileRemoveHandler, 
  FileOpenHandler, 
  DragEventHandler, 
  TestSelectionHandler, 
  ExportHandler,
  UploadResponse,
  TestGenerationRequest,
} from '../types';
import { API_ENDPOINTS } from '../config/api';

const UploadTestData: React.FC<UploadTestDataProps> = () => {
  const { theme } = useTheme();
  const [testData, setTestData] = useState<string>('');
  const [isRealTime, setIsRealTime] = useState<boolean>(true);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Test generation state
  const [generatedTestCases, setGeneratedTestCases] = useState<TestCase[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [totalGenerated, setTotalGenerated] = useState<number>(0);
  const [hasMoreTests, setHasMoreTests] = useState<boolean>(false);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  // Always use streaming mode
  
  // Dropdown state for sub test generation
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  // Context window state
  const [contextWindowId, setContextWindowId] = useState<string | null>(null);
  const [isGeneratingSubTests, setIsGeneratingSubTests] = useState<boolean>(false);
  const [subTestGenerationError, setSubTestGenerationError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
      // Close sub test dropdown when clicking outside
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Use generated test cases or fallback to empty array
  const testCases = generatedTestCases.length > 0 ? generatedTestCases : [];

  const toggleTestSelection: TestSelectionHandler = (testId: number): void => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const selectAllTests = (): void => {
    if (selectedTests.size === testCases.length && testCases.length > 0) {
      // If all are selected, deselect all
      setSelectedTests(new Set());
    } else {
      // Select all test cases
      setSelectedTests(new Set(testCases.map(test => test.id)));
    }
  };

  const exportAsCSV: ExportHandler = (): void => {
    const selectedTestCases = testCases.filter(test => selectedTests.has(test.id));
    const csvContent = [
      ['ID', 'Summary', 'Precondition', 'Steps', 'Expected Result', 'Priority'],
      ...selectedTestCases.map(test => [
        test.id,
        test.summary,
        test.precondition,
        test.steps,
        test.expectedResult,
        test.priority
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-cases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportAsJSON: ExportHandler = (): void => {
    const selectedTestCases = testCases.filter(test => selectedTests.has(test.id));
    const jsonContent = JSON.stringify(selectedTestCases, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-cases.json';
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  // Generate sub-test cases using context window
  const generateSubTests = async (parentTestCase: TestCase, count: number) => {
    try {
      setIsGeneratingSubTests(true);
      setSubTestGenerationError(null);
      setOpenDropdown(null);

      // Create context window if it doesn't exist
      let currentContextWindowId = contextWindowId;
      if (!currentContextWindowId) {
        const createResponse = await fetch('/api/test-generation/generate-with-context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            prompt: `Initial test case: ${parentTestCase.summary}`,
            count: 1
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create context window');
        }

        const createData = await createResponse.json();
        if (createData.success && createData.contextWindow) {
          currentContextWindowId = createData.contextWindow.id;
          setContextWindowId(currentContextWindowId);
        }
      }

      // Generate sub-test cases
      const response = await fetch('/api/test-generation/generate-with-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          prompt: `Generate ${count} detailed sub-test cases for: ${parentTestCase.summary}`,
          contextWindowId: currentContextWindowId,
          parentTestCaseId: parentTestCase.id.toString(),
          count: count
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate sub-test cases');
      }

      const data = await response.json();
      if (data.success && data.testCases) {
        // Add sub-test cases to the main list
        setGeneratedTestCases(prev => [...prev, ...data.testCases]);
        console.log(`✅ Generated ${data.testCases.length} sub-test cases for: ${parentTestCase.summary}`);
      }
    } catch (error) {
      console.error('❌ Error generating sub-test cases:', error);
      setSubTestGenerationError(error instanceof Error ? error.message : 'Failed to generate sub-test cases');
    } finally {
      setIsGeneratingSubTests(false);
    }
  };

  // const handleFileSelect: FileSelectHandler = (): void => {
  //   fileInputRef.current?.click();
  // };

  const handleFileChange: FileChangeHandler = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile: FileRemoveHandler = (fileId: string): void => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const openFile: FileOpenHandler = (file: UploadedFile): void => {
    try {
      // Construct the full URL for the file
      const fileUrl = API_ENDPOINTS.FILE_URL(file.url);
      
      // Check file type to determine how to open it
      if (file.type === 'image') {
        // For images, show in preview modal
        setSelectedFile(file);
        setShowPreview(true);
      } else {
        // For other files, open in new tab or download
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Error opening file: ' + (error as Error).message);
    }
  };

  const closePreview = (): void => {
    setShowPreview(false);
    setSelectedFile(null);
  };

  // Drag and drop handlers
  const handleDragEnter: DragEventHandler = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave: DragEventHandler = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver: DragEventHandler = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop: DragEventHandler = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const processFiles = async (files: File[]): Promise<void> => {
    setIsUploading(true);
    
    try {
      // Filter out duplicate files
      const newFiles = files.filter(file => {
        const isDuplicate = uploadedFiles.some(uploadedFile => 
          uploadedFile.originalName === file.name && 
          uploadedFile.size === file.size
        );
        
        if (isDuplicate) {
          console.log(`Skipping duplicate file: ${file.name}`);
          return false;
        }
        return true;
      });

      if (newFiles.length === 0) {
        alert('All selected files are already uploaded.');
        setIsUploading(false);
        return;
      }

      if (newFiles.length < files.length) {
        const duplicateCount = files.length - newFiles.length;
        console.log(`Skipped ${duplicateCount} duplicate file(s)`);
      }

      const formData = new FormData();
      newFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(API_ENDPOINTS.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();
      
      if (result.success) {
        setUploadedFiles(prev => [...prev, ...result.files]);
        
        if (newFiles.length < files.length) {
          const duplicateCount = files.length - newFiles.length;
          console.log(`Uploaded ${result.files.length} new file(s). Skipped ${duplicateCount} duplicate file(s).`);
        }
      } else {
        console.error('Upload failed:', result.error);
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload error: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'P1': return 'bg-red-500 text-white';
      case 'P2': return 'bg-orange-500 text-white';
      case 'P3': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Streaming test generation function
  const generateTestCasesStreaming = useCallback(async (isLoadMore: boolean = false): Promise<void> => {
    if (!testData.trim() && uploadedFiles.length === 0) {
      setGenerationError('Please enter a prompt for test case generation or upload files');
      return;
    }

    if (isGenerating || isStreaming) {
      return;
    }

    console.log('🚀 Starting streaming generation...');
    setIsGenerating(true);
    setIsStreaming(true);
    setGenerationError(null);
    
    // Reset offset for new generation (not load more)
    if (!isLoadMore) {
      setCurrentOffset(0);
    }

    try {
      const uniqueRequestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const request: TestGenerationRequest = {
        prompt: testData.trim() || 'Generate test cases from the uploaded files',
        fileIds: uploadedFiles.map(file => file.id),
        count: isLoadMore ? 10 : 10,
        offset: isLoadMore ? currentOffset : 0,
        requestId: uniqueRequestId
      };

      // Use fetch with streaming for Server-Sent Events
      const response = await fetch(API_ENDPOINTS.TEST_GENERATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Initialize streaming

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'connection':
                  console.log('🔗 Connected to streaming:', data.message);
                  break;
                  
                case 'testCase':
                  // Add new test case to the list
                  setGeneratedTestCases(prev => {
                    if (isLoadMore) {
                      return [...prev, data.testCase];
                    } else {
                      return [...prev, data.testCase];
                    }
                  });
                  
                  // Update total count
                  setTotalGenerated(prev => prev + 1);
                  
                  console.log(`✅ Received test case ${data.index}/${data.total}: ${data.testCase.summary}`);
                  break;
                  
                case 'complete':
                  setHasMoreTests(data.hasMore);
                  console.log('🎉 Streaming complete:', data.message);
                  break;
                  
                case 'error':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
      }

    } catch (error) {
      let errorMessage = 'Failed to generate test cases';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setGenerationError(errorMessage);
      console.error('❌ Streaming error:', error);
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
      console.log('🏁 Streaming generation finished');
    }
  }, [testData, uploadedFiles, isGenerating, isStreaming, currentOffset]);


  // Load more test cases
  const loadMoreTestCases = (): void => {
    setCurrentOffset(prev => prev + 10); // Update offset for next batch
    generateTestCasesStreaming(true);
  };

  // Reset loading state (emergency function)
  const resetLoadingState = (): void => {
    setIsGenerating(false);
    setIsStreaming(false);
    setGenerationError(null);
  };

  // Clear selections when new test cases are generated
  useEffect(() => {
    if (generatedTestCases.length > 0) {
      setSelectedTests(new Set());
    }
  }, [generatedTestCases.length]);

  // Handle Enter key press for test data textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Allow new line (default behavior)
        return;
      } else {
        // Enter: Generate test cases (prevent new line)
        e.preventDefault();
        e.stopPropagation();
        
        // Allow generation if there's text data OR uploaded files
        if (!isGenerating && (testData.trim() || uploadedFiles.length > 0)) {
          generateTestCasesStreaming(false);
        }
      }
    }
  };


  // Handle Enter key press for file upload area
  const handleDropZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' && !isUploading) {
      e.preventDefault();
      e.stopPropagation();
      
      // If files are already uploaded, generate test cases
      if (uploadedFiles.length > 0 && !isGenerating) {
        generateTestCasesStreaming(false);
      } else {
        // Otherwise, open file dialog
        fileInputRef.current?.click();
      }
    }
  };

      
  return (
    <div className="space-y-6 px-8">
      {/* Test Data Input Section */}
      <div className={`rounded-lg p-6 border ${
        theme === 'light' 
          ? 'bg-white border-gray-200 shadow-sm' 
          : 'bg-gray-800 border-gray-700'
      }`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Test Data Content
            </label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full h-96 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none ${
                theme === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                  : 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
              }`}
              placeholder="Enter your test data content here..."
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <span className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>Standard</span>
                <button
                  onClick={() => setIsRealTime(!isRealTime)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isRealTime ? 'bg-teal-500' : theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isRealTime ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>Real-time</span>
              </div>
              
            </div>
          </div>

          <div className="space-y-4">
            <span className={`text-sm ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>Or upload a file:</span>
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragEnter={!isUploading ? handleDragEnter : undefined}
              onDragLeave={!isUploading ? handleDragLeave : undefined}
              onDragOver={!isUploading ? handleDragOver : undefined}
              onDrop={!isUploading ? handleDrop : undefined}
              onKeyDown={handleDropZoneKeyDown}
              onClick={() => {
                // Focus the drop zone when clicked
                dropZoneRef.current?.focus();
              }}
              tabIndex={0}
              className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isUploading
                  ? 'border-yellow-400 bg-yellow-500/10 cursor-not-allowed'
                  : isDragOver
                    ? 'border-teal-400 bg-teal-500/10'
                    : theme === 'light'
                      ? 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
              }`}
            >
              <div className="text-center">
                <ArrowUpTrayIcon className={`w-8 h-8 mx-auto mb-2 ${
                  isDragOver ? 'text-teal-400' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  isDragOver ? 'text-teal-400' : isUploading ? 'text-yellow-400' : theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  {isUploading 
                    ? 'Uploading files...' 
                    : isDragOver 
                      ? 'Drop files here to upload' 
                      : uploadedFiles.length > 0
                        ? 'Files uploaded! Press Enter to generate test cases'
                        : 'Drag and drop files here, or click to browse '
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Supports: .txt, .docx, .png, .jpg, .jpeg, .img, .pdf, .doc, .xls, .xlsx, .ppt, .pptx, .zip, .rar
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.docx,.png,.jpg,.jpeg,.img,.pdf,.doc,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                onChange={handleFileChange}
                disabled={isUploading}
                className={`absolute inset-0 w-full h-full opacity-0 ${
                  isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
            </div>

            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <span className={`text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>Uploaded files:</span>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-xs ${
                      theme === 'light'
                        ? 'bg-gray-100 border border-gray-300'
                        : 'bg-gray-700 border border-gray-600'
                    }`}>
                      <DocumentIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <button
                        onClick={() => openFile(file)}
                        className={`hover:text-teal-400 transition-colors truncate max-w-32 text-left cursor-pointer ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}
                        title={`Click to view: ${file.originalName}`}
                      >
                        {file.originalName}
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className={`hover:text-red-400 transition-colors ml-1 flex-shrink-0 cursor-pointer ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                        title="Remove file"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <LoadingButton
            onClick={() => generateTestCasesStreaming(false)}
            loading={isGenerating || isStreaming}
            loadingText="Generating Test Cases..."
            variant="primary"
            size="lg"
            className="w-full"
          >
            Process Data
          </LoadingButton>
          
          {generationError && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{generationError}</p>
            </div>
          )}

          {subTestGenerationError && (
            <div className="mt-4 p-4 bg-orange-900/20 border border-orange-500/50 rounded-lg">
              <p className="text-orange-400 text-sm">{subTestGenerationError}</p>
              <button 
                onClick={() => setSubTestGenerationError(null)}
                className="mt-2 text-sm underline hover:no-underline text-orange-300"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generated Test Cases */}
      <div className={`rounded-lg border ${
        theme === 'light' 
          ? 'bg-white border-gray-200 shadow-sm' 
          : 'bg-gray-800 border-gray-700'
      }`}>
        <div className={`p-6 border-b ${
          theme === 'light' ? 'border-gray-200' : 'border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              {generatedTestCases.length > 0 ? (
                <>Generation Complete <span className="text-teal-400">{totalGenerated} tests</span></>
              ) : (
                'Test Cases'
              )}
            </h2>
            <div className="flex items-center space-x-4">
              <button className={`p-2 transition-colors ${
                theme === 'light' 
                  ? 'text-gray-500 hover:text-gray-700' 
                  : 'text-gray-400 hover:text-white'
              }`}>
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <label className={`flex items-center space-x-2 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={selectedTests.size === testCases.length && testCases.length > 0}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectedTests.size > 0 && selectedTests.size < testCases.length;
                    }
                  }}
                  onChange={selectAllTests}
                  className={`rounded text-teal-500 focus:ring-teal-500 ${
                    theme === 'light' 
                      ? 'border-gray-300 bg-white' 
                      : 'border-gray-600 bg-gray-700'
                  }`}
                />
                <span className="text-sm">Select All</span>
              </label>
              <select className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300 text-gray-700'
                  : 'bg-gray-700 border border-gray-600 text-gray-300'
              }`}>
                <option>Select project key *</option>
              </select>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span>Export</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {showExportDropdown && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-10 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-200'
                      : 'bg-gray-800 border border-gray-700'
                  }`}>
                    <button
                      onClick={exportAsCSV}
                      className={`w-full px-4 py-2 text-left transition-colors first:rounded-t-lg cursor-pointer ${
                        theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={exportAsJSON}
                      className={`w-full px-4 py-2 text-left transition-colors last:rounded-b-lg cursor-pointer ${
                        theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Test Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  SELECT
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  NO.
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  SUMMARY
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  PRECONDITION
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  STEPS
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  EXPECTED RESULT
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  PRIORITY
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              theme === 'light' 
                ? 'bg-white divide-gray-200' 
                : 'bg-gray-800 divide-gray-700'
            }`}>
              {testCases.map((test) => (
                <tr key={test.id} className={theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(test.id)}
                      onChange={() => toggleTestSelection(test.id)}
                      className={`rounded text-teal-500 focus:ring-teal-500 ${
                        theme === 'light' 
                          ? 'border-gray-300 bg-white' 
                          : 'border-gray-600 bg-gray-700'
                      }`}
                    />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {test.id}
                  </td>
                  <td className={`px-6 py-4 text-sm max-w-xs ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <div className={`max-h-20 overflow-y-auto hover:max-h-40 transition-all duration-300 ease-in-out scrollbar-thin ${
                      theme === 'light' 
                        ? 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-600' 
                        : 'scrollbar-thumb-gray-600 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-500'
                    }`}>
                      {test.summary}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm max-w-xs ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <div className={`max-h-20 overflow-y-auto hover:max-h-40 transition-all duration-300 ease-in-out scrollbar-thin ${
                      theme === 'light' 
                        ? 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-600' 
                        : 'scrollbar-thumb-gray-600 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-500'
                    }`}>
                      {test.precondition}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm max-w-xs ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <div className={`max-h-20 overflow-y-auto hover:max-h-40 transition-all duration-300 ease-in-out scrollbar-thin ${
                      theme === 'light' 
                        ? 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-600' 
                        : 'scrollbar-thumb-gray-600 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-500'
                    }`}>
                      {test.steps}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm max-w-xs ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    <div className={`max-h-20 overflow-y-auto hover:max-h-40 transition-all duration-300 ease-in-out scrollbar-thin ${
                      theme === 'light' 
                        ? 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-600' 
                        : 'scrollbar-thumb-gray-600 scrollbar-track-gray-700 hover:scrollbar-thumb-gray-500'
                    }`}>
                      {test.expectedResult}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(test.priority)}`}>
                      {test.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <button 
                        onClick={() => setOpenDropdown(openDropdown === test.id ? null : test.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          theme === 'light'
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                        }`}
                      >
                        <span className="text-sm">Generate Sub Tests</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === test.id ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdown === test.id && (
                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-10 ${
                          theme === 'light'
                            ? 'bg-white border-gray-200'
                            : 'bg-gray-800 border-gray-600'
                        }`}>
                          <div className="py-1">
                            <button 
                              onClick={() => generateSubTests(test, 3)}
                              disabled={isGeneratingSubTests}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                theme === 'light'
                                  ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {isGeneratingSubTests ? 'Generating...' : 'Generate 3 Sub Tests'}
                            </button>
                            <button 
                              onClick={() => generateSubTests(test, 5)}
                              disabled={isGeneratingSubTests}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                theme === 'light'
                                  ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {isGeneratingSubTests ? 'Generating...' : 'Generate 5 Sub Tests'}
                            </button>
                            <button 
                              onClick={() => generateSubTests(test, 10)}
                              disabled={isGeneratingSubTests}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                theme === 'light'
                                  ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {isGeneratingSubTests ? 'Generating...' : 'Generate 10 Sub Tests'}
                            </button>
                            <div className={`border-t my-1 ${
                              theme === 'light' ? 'border-gray-200' : 'border-gray-600'
                            }`}></div>
                            <button 
                              onClick={() => {
                                console.log('Custom sub test generation for:', test.summary);
                                setOpenDropdown(null);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                theme === 'light'
                                  ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                              }`}
                            >
                              Custom Count...
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Show shimmer loading for next test case only */}
              {isStreaming && (
                <>
                  <ShimmerLoader 
                    count={1} 
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
        
         {/* Load More Button */}
         {hasMoreTests && generatedTestCases.length > 0 && totalGenerated < 100 && (
          <div className="p-6 border-t border-gray-700">
            <LoadingButton
              onClick={loadMoreTestCases}
              loading={isGenerating || isStreaming}
              loadingText="Loading More..."
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Load More (10 more tests)
            </LoadingButton>
            
            {/* Emergency Reset Button */}
            {isGenerating && (
              <button
                onClick={resetLoadingState}
                className="mt-2 w-full py-2 px-4 rounded-lg font-medium bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Reset Loading State
              </button>
            )}
            </div>
          )}
          
          {/* Maximum Limit Reached Message */}
          {totalGenerated >= 100 && (
            <div className="p-6 border-t border-gray-700">
              <div className="text-center text-gray-400">
                <p className="text-sm">🎉 Maximum limit reached: 100 test cases</p>
                <p className="text-xs mt-1">You can export or start a new generation</p>
              </div>
            </div>
          )}
          
          {/* Empty State */}
        {generatedTestCases.length === 0 && !isGenerating && (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <DocumentIcon className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Test Cases Generated</h3>
              <p className="text-gray-400">
                Enter a prompt and click "Process Data" to generate test cases using AI.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {selectedFile.originalName}
              </h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-gray-700 rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">File Name:</span>
                    <p className="text-white">{selectedFile.originalName}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">File Size:</span>
                    <p className="text-white">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <span className="text-gray-400">File Type:</span>
                    <p className="text-white">{selectedFile.mimetype}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Uploaded:</span>
                    <p className="text-white">{new Date(selectedFile.uploadedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Image Preview */}
              {selectedFile.type === 'image' && (
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-700">
                  <img
                    src={`http://localhost:5000${selectedFile.url}`}
                    alt={selectedFile.originalName}
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const nextSibling = target.nextSibling as HTMLElement;
                      if (nextSibling) {
                        nextSibling.style.display = 'block';
                      }
                    }}
                  />
                  <div className="hidden text-center text-gray-400 py-8">
                    <p>Failed to load image preview</p>
                    <button
                      onClick={() => window.open(`http://localhost:5000${selectedFile.url}`, '_blank')}
                      className="mt-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors cursor-pointer"
                    >
                      Open in New Tab
                    </button>
                  </div>
                </div>
              )}

              {/* Non-image files */}
              {selectedFile.type !== 'image' && (
                <div className="bg-gray-700 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-gray-400 mb-4">
                    <p>Preview not available for this file type</p>
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `http://localhost:5000${selectedFile.url}`;
                      link.download = selectedFile.originalName;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors cursor-pointer"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTestData;
