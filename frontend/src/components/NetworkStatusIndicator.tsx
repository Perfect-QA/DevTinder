import React from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  isReconnecting: boolean;
  retryCount: number;
  onRetry: () => void;
  className?: string;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  isOnline,
  isReconnecting,
  retryCount,
  onRetry,
  className = ''
}) => {
  if (isOnline) {
    return (
      <div className={`flex items-center space-x-2 text-green-500 ${className}`}>
        <CheckCircleIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Online</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
      <XCircleIcon className="w-4 h-4" />
      <span className="text-sm font-medium">Offline</span>
      {retryCount > 0 && (
        <span className="text-xs text-gray-400">
          ({retryCount} attempts)
        </span>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
