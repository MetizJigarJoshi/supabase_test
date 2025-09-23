import React from 'react';
import { TestCategory } from '../App';
import {
  HomeIcon,
  UserIcon,
  DatabaseIcon,
  FolderIcon,
  BoltIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ServerIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeCategory: TestCategory;
  onCategoryChange: (category: TestCategory) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'auth', label: 'Authentication', icon: UserIcon },
  { id: 'database', label: 'Database', icon: DatabaseIcon },
  { id: 'storage', label: 'Storage', icon: FolderIcon },
  { id: 'realtime', label: 'Realtime', icon: BoltIcon },
  { id: 'api', label: 'API Testing', icon: GlobeAltIcon },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  { id: 'performance', label: 'Performance', icon: ChartBarIcon },
  { id: 'backup', label: 'Backup & Recovery', icon: ServerIcon },
  { id: 'runner', label: 'Test Runner', icon: PlayIcon },
] as const;

const Sidebar: React.FC<SidebarProps> = ({ activeCategory, onCategoryChange }) => {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Supabase Tester</h1>
        <p className="text-sm text-gray-600 mt-1">Testing Dashboard</p>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeCategory === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onCategoryChange(item.id as TestCategory)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;