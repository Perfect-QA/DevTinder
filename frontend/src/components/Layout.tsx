import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutProps } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen flex ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-sky-50 to-blue-50' 
        : 'bg-black'
    }`}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className={`flex-1 p-6 ${
          theme === 'light' 
            ? 'bg-gradient-to-br from-sky-50 to-blue-50' 
            : 'bg-black'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
