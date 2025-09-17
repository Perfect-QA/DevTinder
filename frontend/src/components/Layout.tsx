import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutProps } from '../types';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 bg-black p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
