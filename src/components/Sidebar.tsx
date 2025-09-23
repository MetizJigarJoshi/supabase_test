import React from 'react';
import { TestCategory } from '../App';
import {
  HomeIcon,
  UserIcon,
  ServerStackIcon,
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
  { id: 'database', label: 'Database', icon: ServerStackIcon },
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
    <div className="sidebar">
      <div className="card-header">
        <h1 className="text-xl font-bold text-gradient">Supabase Tester</h1>
        <p className="text-sm text-gray-600 mt-1">Modern Testing Dashboard</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeCategory === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onCategoryChange(item.id as TestCategory)}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-300 ${
                isActive
                  ? 'gradient-primary text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:transform hover:translateX-2'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;