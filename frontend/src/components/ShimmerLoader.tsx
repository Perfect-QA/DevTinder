import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ShimmerLoaderProps {
  count?: number;
  className?: string;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ count = 1, className = '' }) => {
  const { theme } = useTheme();
  
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <tr key={`shimmer-${index}`} className={`animate-pulse ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-800/50'
        }`}>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className={`w-4 h-4 rounded animate-pulse ${
              theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
            }`}></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className={`w-8 h-4 rounded animate-pulse ${
              theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
            }`}></div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className={`h-4 rounded w-3/4 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`h-3 rounded w-1/2 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className={`h-3 rounded w-full animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`h-3 rounded w-2/3 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className={`h-3 rounded w-full animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`h-3 rounded w-4/5 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`h-3 rounded w-3/5 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className={`h-3 rounded w-full animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`h-3 rounded w-2/3 animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className={`w-8 h-6 rounded-full animate-pulse ${
              theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
            }`}></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
              <div className={`w-16 h-6 rounded animate-pulse ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
              }`}></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default ShimmerLoader;
