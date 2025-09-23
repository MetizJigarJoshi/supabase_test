import React, { useState } from 'react';
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
    switch (activeCategory) {
      case 'dashboard':
        return <Dashboard />;
      case 'auth':
        return <AuthTests />;
      case 'database':
        return <DatabaseTests />;
      case 'storage':
        return <StorageTests />;
      case 'realtime':
        return <RealtimeTests />;
      case 'api':
        return <ApiTests />;
      case 'security':
        return <SecurityTests />;
      case 'performance':
        return <PerformanceTests />;
      case 'backup':
        return <BackupTests />;
      case 'runner':
        return <TestRunner />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <NotificationProvider>
      <TestProvider>
        <div className="flex h-screen bg-gray-100">
          <Sidebar 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory} 
          />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              {renderContent()}
            </div>
          </main>
          <NotificationContainer />
        </div>
      </TestProvider>
    </NotificationProvider>
  );
}

export default App;