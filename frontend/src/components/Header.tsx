import React from 'react';
import { HeaderProps } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC<HeaderProps> = () => {
  const { theme } = useTheme();
  
  return (
    <div className={`px-6 py-4 flex items-center justify-between ${
      theme === 'light' 
        ? 'bg-white border-b border-gray-200' 
        : 'bg-gray-800 border-b border-gray-700'
    }`}>
      <div>
        <h1 className={`text-3xl font-bold ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}>
          Upload Test Data
        </h1>
        <p className={`mt-1 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Enter your test data directly or upload a file in .txt, .docx, or .png format
        </p>
      </div>
    </div>
  );
};

export default Header;
