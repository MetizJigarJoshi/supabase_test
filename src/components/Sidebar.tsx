import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestCategory } from '../App';
import {
  LayoutDashboard,
  Shield,
  Database,
  FolderOpen,
  Zap,
  Globe,
  ShieldCheck,
  BarChart3,
  HardDrive,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeCategory: TestCategory;
  onCategoryChange: (category: TestCategory) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'auth', label: 'Authentication', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'storage', label: 'Storage', icon: FolderOpen },
  { id: 'realtime', label: 'Realtime', icon: Zap },
  { id: 'api', label: 'API Testing', icon: Globe },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'backup', label: 'Backup & Recovery', icon: HardDrive },
  { id: 'runner', label: 'Test Runner', icon: Play },
] as const;

const Sidebar: React.FC<SidebarProps> = ({ activeCategory, onCategoryChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex h-screen flex-col border-r border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-950/80"
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200/50 px-4 dark:border-gray-800/50">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Database className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Supabase Tester
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Testing Dashboard
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeCategory === item.id;
          
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ x: isCollapsed ? 0 : 4 }}
              onClick={() => onCategoryChange(item.id as TestCategory)}
              className={`group relative flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-white'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <Icon className={`h-5 w-5 flex-shrink-0 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`} />
              
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-lg bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200/50 p-4 dark:border-gray-800/50">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 dark:from-blue-900/20 dark:to-indigo-900/20"
            >
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                Pro Tip
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Use the Test Runner to execute multiple test suites automatically.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

export default Sidebar;