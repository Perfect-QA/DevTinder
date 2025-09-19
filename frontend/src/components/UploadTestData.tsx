import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowsPointingOutIcon,
  PencilIcon,
  ChevronDownIcon,
  XMarkIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
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
  TestGenerationResponse
} from '../types';

const UploadTestData: React.FC<UploadTestDataProps> = () => {
  const [testData, setTestData] = useState<string>('generate high priority test cases for otp verification inside the login page');
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
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
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
    if (selectedTests.size === testCases.length) {
      setSelectedTests(new Set());
    } else {
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
      const fileUrl = `http://localhost:5000${file.url}`;
      
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

      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();
      
      if (result.success) {
        setUploadedFiles(prev => [...prev, ...result.files]);
        console.log('Files uploaded successfully:', result.files);
        
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

  // Test generation function
  const generateTestCases = async (isLoadMore: boolean = false): Promise<void> => {
    if (!testData.trim()) {
      setGenerationError('Please enter a prompt for test case generation');
      return;
    }

    // Prevent multiple simultaneous requests
    if (isGenerating) {
      console.log('Generation already in progress, skipping request');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Generate unique request ID to prevent duplicates
      const uniqueRequestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const request: TestGenerationRequest = {
        prompt: testData.trim(),
        fileIds: uploadedFiles.map(file => file.id),
        count: isLoadMore ? 30 : 10,
        offset: isLoadMore ? currentOffset : 0,
        requestId: uniqueRequestId
      };

      console.log('Generating test cases...', request);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timed out, aborting...');
        controller.abort();
      }, 120000); // 2 minute timeout for OpenAI API calls

      console.log('Making request to:', '/api/test-generation/generate');
      const response = await fetch('/api/test-generation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Response received:', response.status, response.statusText);

      const result: TestGenerationResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate test cases');
      }

      if (isLoadMore) {
        // Append new test cases to existing ones
        setGeneratedTestCases(prev => [...prev, ...result.testCases]);
        setCurrentOffset(prev => prev + result.testCases.length);
      } else {
        // Replace existing test cases
        setGeneratedTestCases(result.testCases);
        setCurrentOffset(result.testCases.length);
        setSelectedTests(new Set()); // Clear selections
      }

      setTotalGenerated(result.totalGenerated);
      setHasMoreTests(result.hasMore);

      console.log(`✅ Generated ${result.testCases.length} test cases successfully`);

    } catch (error) {
      console.error('❌ Test generation failed:', error);
      
      let errorMessage = 'Failed to generate test cases';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load more test cases
  const loadMoreTestCases = (): void => {
    generateTestCases(true);
  };

  // Reset loading state (emergency function)
  const resetLoadingState = (): void => {
    setIsGenerating(false);
    setGenerationError(null);
  };

  return (
    <div className="space-y-6 px-8">
      {/* Test Data Input Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Test Data Content
            </label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="w-full h-96 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Enter your test data content here..."
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Standard</span>
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isRealTime ? 'bg-teal-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRealTime ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-300">Real-time</span>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-sm text-gray-300">Or upload a file:</span>
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragEnter={!isUploading ? handleDragEnter : undefined}
              onDragLeave={!isUploading ? handleDragLeave : undefined}
              onDragOver={!isUploading ? handleDragOver : undefined}
              onDrop={!isUploading ? handleDrop : undefined}
              className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                isUploading
                  ? 'border-yellow-400 bg-yellow-500/10 cursor-not-allowed'
                  : isDragOver
                    ? 'border-teal-400 bg-teal-500/10'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
              }`}
            >
              <div className="text-center">
                <ArrowUpTrayIcon className={`w-8 h-8 mx-auto mb-2 ${
                  isDragOver ? 'text-teal-400' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  isDragOver ? 'text-teal-400' : isUploading ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  {isUploading 
                    ? 'Uploading files...' 
                    : isDragOver 
                      ? 'Drop files here to upload' 
                      : 'Drag and drop files here, or click to browse'
                  }
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports: .txt, .docx, .png, .jpg, .jpeg, .pdf, .doc, .xls, .xlsx, .ppt, .pptx, .zip, .rar
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.docx,.png,.jpg,.jpeg,.pdf,.doc,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
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
                <span className="text-sm text-gray-300">Uploaded files:</span>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs">
                      <DocumentIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <button
                        onClick={() => openFile(file)}
                        className="text-gray-300 hover:text-teal-400 transition-colors truncate max-w-32 text-left cursor-pointer"
                        title={`Click to view: ${file.originalName}`}
                      >
                        {file.originalName}
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors ml-1 flex-shrink-0 cursor-pointer"
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

          <button 
            onClick={() => generateTestCases(false)}
            disabled={isGenerating}
            className={`w-full font-medium py-3 px-6 rounded-lg transition-colors cursor-pointer ${
              isGenerating 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            {isGenerating ? 'Generating Test Cases...' : 'Process Data'}
          </button>
          
          {generationError && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{generationError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Generated Test Cases */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {generatedTestCases.length > 0 ? (
                <>Generation Complete <span className="text-teal-400">{totalGenerated} tests</span></>
              ) : (
                'Test Cases'
              )}
            </h2>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <label className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedTests.size === testCases.length}
                  onChange={selectAllTests}
                  className="rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm">Select All</span>
              </label>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option>Select project key *</option>
              </select>
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <span>Export</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={exportAsCSV}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors first:rounded-t-lg cursor-pointer"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={exportAsJSON}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors last:rounded-b-lg cursor-pointer"
                    >
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>
              <button className="px-4 py-2 bg-teal-500/20 border border-teal-500 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors cursor-pointer">
                Push Selected to Xray ({selectedTests.size})
              </button>
            </div>
          </div>
        </div>

        {/* Test Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  SELECT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  NO.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  SUMMARY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  PRECONDITION
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  STEPS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  EXPECTED RESULT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  PRIORITY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {testCases.map((test) => (
                <tr key={test.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(test.id)}
                      onChange={() => toggleTestSelection(test.id)}
                      className="rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {test.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                    {test.summary}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                    {test.precondition}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                    {test.steps}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                    {test.expectedResult}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(test.priority)}`}>
                      {test.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-1 bg-teal-500/20 border border-teal-500 text-teal-400 rounded text-xs hover:bg-teal-500/30 transition-colors cursor-pointer">
                        Push to Xray
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Load More Button */}
        {hasMoreTests && generatedTestCases.length > 0 && (
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={loadMoreTestCases}
              disabled={isGenerating}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                isGenerating
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-500/20 border border-teal-500 text-teal-400 hover:bg-teal-500/30'
              }`}
            >
              {isGenerating ? 'Loading More...' : 'Load More (30 more tests)'}
            </button>
            
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
