import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  loading: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  text = 'Loading...',
  children,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <LoadingSpinner
              size="lg"
              color="primary"
              text={text}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;
