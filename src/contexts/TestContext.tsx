import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TestResultData } from '../components/TestResult';

interface TestContextType {
  results: TestResultData[];
  addResult: (result: TestResultData) => void;
  updateResult: (id: string, updates: Partial<TestResultData>) => void;
  clearResults: () => void;
  getResultsByCategory: (category: string) => TestResultData[];
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};

interface TestProviderProps {
  children: ReactNode;
}

export const TestProvider: React.FC<TestProviderProps> = ({ children }) => {
  const [results, setResults] = useState<TestResultData[]>([]);

  const addResult = (result: TestResultData) => {
    setResults(prev => [result, ...prev]);
  };

  const updateResult = (id: string, updates: Partial<TestResultData>) => {
    setResults(prev => 
      prev.map(result => 
        result.id === id ? { ...result, ...updates } : result
      )
    );
  };

  const clearResults = () => {
    setResults([]);
  };

  const getResultsByCategory = (category: string) => {
    return results.filter(result => result.id.startsWith(category));
  };

  return (
    <TestContext.Provider value={{
      results,
      addResult,
      updateResult,
      clearResults,
      getResultsByCategory
    }}>
      {children}
    </TestContext.Provider>
  );
};