import React from 'react';

const Header = () => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <h1 className="text-3xl font-bold text-white">Upload Test Data</h1>
      <p className="text-gray-400 mt-1">
        Enter your test data directly or upload a file in .txt, .docx, or .png format
      </p>
    </div>
  );
};

export default Header;
