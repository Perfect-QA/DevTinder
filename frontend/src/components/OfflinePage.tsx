import React from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface OfflinePageProps {
  onRetry?: () => void;
  retryCount?: number;
  isRetrying?: boolean;
}

const OfflinePage: React.FC<OfflinePageProps> = ({ 
  onRetry, 
  retryCount = 0, 
  isRetrying = false
}) => {
  const handleRetry = async () => {
    if (onRetry) {
      await onRetry();
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Offline Content */}
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <WifiIcon className="w-20 h-20 text-gray-600 mx-auto" />
            <XCircleIcon className="w-8 h-8 text-red-500 absolute -top-2 -right-2" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">You're Offline</h1>
          <p className="text-gray-400 text-lg mb-2">
            It looks like you've lost your internet connection.
          </p>
          <p className="text-gray-500 text-sm">
            Please check your network connection and try again.
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 font-medium">Connection Status</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">Offline</span>
            </div>
          </div>
          
          {retryCount > 0 && (
            <div className="text-sm text-gray-400">
              Retry attempts: {retryCount}
            </div>
          )}
        </div>

        {/* Troubleshooting Tips */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
            Troubleshooting Tips
          </h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="text-teal-400 mr-2">•</span>
              Check your Wi-Fi or mobile data connection
            </li>
            <li className="flex items-start">
              <span className="text-teal-400 mr-2">•</span>
              Try refreshing the page
            </li>
            <li className="flex items-start">
              <span className="text-teal-400 mr-2">•</span>
              Restart your router or modem
            </li>
            <li className="flex items-start">
              <span className="text-teal-400 mr-2">•</span>
              Check if other websites are working
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isRetrying ? (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Try Again
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            PerfectAI Test Case Generator
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
