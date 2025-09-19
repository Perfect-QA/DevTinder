import React, { useState } from 'react';
import { 
  HomeIcon, 
  FolderIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  SunIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  UserIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/outline';
import { SidebarProps } from '../types';

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }> | null;
  active: boolean;
}

interface ExpandedSections {
  testManagement: boolean;
  settings: boolean;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    testManagement: true,
    settings: false
  });

  const toggleSection = (section: keyof ExpandedSections): void => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const mainNavItems: NavItem[] = [
    { name: 'Dashboard', icon: HomeIcon, active: false },
    { name: 'Projects', icon: FolderIcon, active: false },
    { name: 'Documentation', icon: DocumentTextIcon, active: false },
    { name: 'Pricing', icon: CurrencyDollarIcon, active: false }
  ];

  const testManagementItems: NavItem[] = [
    { name: 'Generate Tests', icon: null, active: false },
    { name: 'Modify Tests', icon: null, active: false },
    { name: 'Regression Tests', icon: null, active: false },
    { name: 'Upload Data', icon: ArrowUpIcon, active: true },
    { name: 'Defect Predictor', icon: null, active: false }
  ];

  const settingsItems: NavItem[] = [
    { name: 'Integrations', icon: null, active: false },
    { name: 'Project Context', icon: null, active: false }
  ];

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo and Theme Toggle */}
      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
        <img src="/perfectcase_logo.svg" alt="logo" className='h-12 w-auto'/>
        {/* <div className="text-white font-bold text-xl">PerfectAI</div> */}
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <SunIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-2">
          {mainNavItems.map((item) => (
            <button
              key={item.name}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                item.active 
                  ? 'bg-teal-500/20 text-teal-400' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon && <item.icon className="w-5 h-5" />}
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </div>

        {/* Test Management Section */}
        <div>
          <button
            onClick={() => toggleSection('testManagement')}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="font-semibold text-sm uppercase tracking-wider">Test Management</span>
            {expandedSections.testManagement ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          
          {expandedSections.testManagement && (
            <div className="mt-2 space-y-1">
              {testManagementItems.map((item) => (
                <button
                  key={item.name}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    item.active 
                      ? 'bg-teal-500/20 text-teal-400' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div>
          <button
            onClick={() => toggleSection('settings')}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <span className="font-semibold text-sm uppercase tracking-wider">Settings</span>
            {expandedSections.settings ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          
          {expandedSections.settings && (
            <div className="mt-2 space-y-1">
              {settingsItems.map((item) => (
                <button
                  key={item.name}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <span className="text-sm">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-gray-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300">mr.vinitprajapati07@gm...</p>
          </div>
        </div>
        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
