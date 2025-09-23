import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import AuthTests from './components/tests/AuthTests';
import DatabaseTests from './components/tests/DatabaseTests';
import StorageTests from './components/tests/StorageTests';
import RealtimeTests from './components/tests/RealtimeTests';
import ApiTests from './components/tests/ApiTests';
import SecurityTests from './components/tests/SecurityTests';
import PerformanceTests from './components/tests/PerformanceTests';
import BackupTests from './components/tests/BackupTests';
import Dashboard from './components/Dashboard';
import TestRunner from './components/TestRunner';
import { TestProvider } from './contexts/TestContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './components/NotificationContainer';

export type TestCategory = 
  | 'dashboard'
  | 'auth'
  | 'database'
  | 'storage'
  | 'realtime'
  | 'api'
  | 'security'
  | 'performance'
  | 'backup'
  | 'runner';

function App() {
  const [activeCategory, setActiveCategory] = useState<TestCategory>('dashboard');

  const renderContent = () => {
    const components = {
      dashboard: Dashboard,
      auth: AuthTests,
      database: DatabaseTests,
      storage: StorageTests,
      realtime: RealtimeTests,
      api: ApiTests,
      security: SecurityTests,
      performance: PerformanceTests,
      backup: BackupTests,
      runner: TestRunner,
    };

    const Component = components[activeCategory];
    return <Component />;
  };

  return (
    <NotificationProvider>
      <TestProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
          <Sidebar 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory} 
          />
          
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="h-full overflow-auto"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
          
          <NotificationContainer />
        </div>
      </TestProvider>
    </NotificationProvider>
  );
}

export default App;