import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpTrayIcon, 
  ArrowsPointingOutIcon,
  PencilIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const UploadTestData = () => {
  const [testData, setTestData] = useState('generate high priority test cases for otp verification inside the login page');
  const [isRealTime, setIsRealTime] = useState(true);
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const testCases = [
    {
      id: 1,
      summary: 'Verify successful login with correct OTP within validity period',
      precondition: 'User is on the login page and has initiated login using a valid phone number/email that triggers OTP generation.',
      steps: '1. Enter the registered phone number/email on the login page and click on \'Send OTP\'. 2. Receive the OTP via SMS/email. 3. Enter the received OTP in the OTP input field. 4. Click on \'Verify OTP\' button.',
      expectedResult: 'User is successfully logged in and redirected to the homepage/dashboard.',
      priority: 'P1'
    },
    {
      id: 2,
      summary: 'Verify error message for incorrect OTP entry',
      precondition: 'User is on the login page and has received an OTP.',
      steps: '1. Enter the registered phone number/email on the login page and click on \'Send OTP\'. 2. Receive the OTP sent to user. 3. Enter an incorrect OTP in the OTP input field. 4. Click on \'Verify OTP\' button.',
      expectedResult: 'Appropriate error message is displayed and user remains on the OTP verification screen.',
      priority: 'P1'
    },
    {
      id: 3,
      summary: 'Verify login fails when OTP is entered after expiry',
      precondition: 'User is on the login page and the OTP validity period is known.',
      steps: '1. Request OTP for login. 2. Wait until the OTP validity period expires. 3. Enter the expired OTP in the OTP input field. 4. Click on \'Verify OTP\' button.',
      expectedResult: 'System displays OTP expired message and prevents login.',
      priority: 'P1'
    },
    {
      id: 4,
      summary: 'Verify user cannot login with OTP from different session',
      precondition: 'User has multiple active sessions or devices.',
      steps: '1. Click \'Send OTP\' on device A. 2. Use the OTP received on device A to login on device B.',
      expectedResult: 'Login should fail with appropriate error message.',
      priority: 'P2'
    },
    {
      id: 5,
      summary: 'Verify OTP resend functionality works correctly',
      precondition: 'User is on the OTP verification screen.',
      steps: '1. Click on \'Resend OTP\' button. 2. Verify new OTP is received. 3. Enter the new OTP and verify login.',
      expectedResult: 'New OTP is sent and user can login successfully.',
      priority: 'P2'
    }
  ];

  const toggleTestSelection = (testId) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const selectAllTests = () => {
    if (selectedTests.size === testCases.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(testCases.map(test => test.id)));
    }
  };

  const exportAsCSV = () => {
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

  const exportAsJSON = () => {
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'P1': return 'bg-red-500 text-white';
      case 'P2': return 'bg-orange-500 text-white';
      case 'P3': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
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
              className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
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

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Or upload a file:</span>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors">
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>Choose File</span>
            </button>
          </div>

          <button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors">
            Process Data
          </button>
        </div>
      </div>

      {/* Generated Test Cases */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Generation Complete <span className="text-teal-400">10 tests</span>
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
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  <span>Export</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={exportAsCSV}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors first:rounded-t-lg"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={exportAsJSON}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 transition-colors last:rounded-b-lg"
                    >
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>
              <button className="px-4 py-2 bg-teal-500/20 border border-teal-500 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors">
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
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-1 bg-teal-500/20 border border-teal-500 text-teal-400 rounded text-xs hover:bg-teal-500/30 transition-colors">
                        Push to Xray
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UploadTestData;
