import React, { useState } from 'react';
import { useTest } from '../contexts/TestContext';
import { useNotification } from '../contexts/NotificationContext';
import TestResult from './TestResult';
import { PlayIcon, StopIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  enabled: boolean;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
}

const TestRunner: React.FC = () => {
  const { results, clearResults } = useTest();
  const { addNotification } = useNotification();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const testSuites: TestSuite[] = [
    {
      id: 'smoke',
      name: 'Smoke Tests',
      description: 'Basic functionality tests to verify system is operational',
      enabled: true,
      tests: [
        { id: 'connection', name: 'Database Connection', category: 'database', enabled: true, priority: 'high' },
        { id: 'auth-signin', name: 'User Sign In', category: 'auth', enabled: true, priority: 'high' },
        { id: 'basic-query', name: 'Basic Query', category: 'database', enabled: true, priority: 'high' },
        { id: 'storage-list', name: 'List Storage Buckets', category: 'storage', enabled: true, priority: 'medium' }
      ]
    },
    {
      id: 'regression',
      name: 'Regression Tests',
      description: 'Comprehensive tests to ensure no functionality has broken',
      enabled: true,
      tests: [
        { id: 'auth-full', name: 'Full Authentication Flow', category: 'auth', enabled: true, priority: 'high' },
        { id: 'database-crud', name: 'Database CRUD Operations', category: 'database', enabled: true, priority: 'high' },
        { id: 'storage-operations', name: 'Storage Operations', category: 'storage', enabled: true, priority: 'medium' },
        { id: 'realtime-basic', name: 'Realtime Subscriptions', category: 'realtime', enabled: true, priority: 'medium' },
        { id: 'api-endpoints', name: 'API Endpoints', category: 'api', enabled: true, priority: 'medium' }
      ]
    },
    {
      id: 'performance',
      name: 'Performance Tests',
      description: 'Tests to verify system performance under load',
      enabled: false,
      tests: [
        { id: 'bulk-insert', name: 'Bulk Data Insert', category: 'performance', enabled: true, priority: 'medium' },
        { id: 'concurrent-queries', name: 'Concurrent Queries', category: 'performance', enabled: true, priority: 'medium' },
        { id: 'large-payload', name: 'Large Payload Handling', category: 'performance', enabled: true, priority: 'low' }
      ]
    },
    {
      id: 'security',
      name: 'Security Tests',
      description: 'Security and authorization tests',
      enabled: false,
      tests: [
        { id: 'unauthorized-access', name: 'Unauthorized Access', category: 'security', enabled: true, priority: 'high' },
        { id: 'jwt-validation', name: 'JWT Validation', category: 'security', enabled: true, priority: 'high' },
        { id: 'sql-injection', name: 'SQL Injection Protection', category: 'security', enabled: true, priority: 'high' }
      ]
    }
  ];

  const [suites, setSuites] = useState(testSuites);

  const toggleSuite = (suiteId: string) => {
    setSuites(prev => prev.map(suite => 
      suite.id === suiteId ? { ...suite, enabled: !suite.enabled } : suite
    ));
  };

  const toggleTest = (suiteId: string, testId: string) => {
    setSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? {
            ...suite,
            tests: suite.tests.map(test => 
              test.id === testId ? { ...test, enabled: !test.enabled } : test
            )
          }
        : suite
    ));
  };

  const getEnabledTests = () => {
    return suites
      .filter(suite => suite.enabled)
      .flatMap(suite => suite.tests.filter(test => test.enabled));
  };

  const runTestSuite = async () => {
    const enabledTests = getEnabledTests();
    
    if (enabledTests.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Tests Selected',
        message: 'Please enable at least one test suite and test case'
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    clearResults();

    addNotification({
      type: 'info',
      title: 'Test Suite Started',
      message: `Running ${enabledTests.length} tests`
    });

    for (let i = 0; i < enabledTests.length; i++) {
      const test = enabledTests[i];
      setCurrentTest(test.name);
      setProgress(((i + 1) / enabledTests.length) * 100);

      try {
        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        
        // Simulate test results (in real implementation, you'd call actual test functions)
        const success = Math.random() > 0.2; // 80% success rate for demo
        
        if (success) {
          addNotification({
            type: 'success',
            title: 'Test Passed',
            message: `${test.name} completed successfully`
          });
        } else {
          addNotification({
            type: 'error',
            title: 'Test Failed',
            message: `${test.name} failed`
          });
        }
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Test Error',
          message: `${test.name} encountered an error`
        });
      }
    }

    setIsRunning(false);
    setCurrentTest(null);
    setProgress(100);

    const passedTests = results.filter(r => r.status === 'success').length;
    const totalTests = enabledTests.length;

    addNotification({
      type: passedTests === totalTests ? 'success' : 'warning',
      title: 'Test Suite Completed',
      message: `${passedTests}/${totalTests} tests passed`
    });
  };

  const stopTestSuite = () => {
    setIsRunning(false);
    setCurrentTest(null);
    addNotification({
      type: 'info',
      title: 'Test Suite Stopped',
      message: 'Test execution has been stopped'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTestStats = () => {
    const total = results.length;
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const running = results.filter(r => r.status === 'running').length;
    
    return { total, passed, failed, running };
  };

  const stats = getTestStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Test Runner</h1>
        <div className="flex space-x-3">
          {!isRunning ? (
            <button
              onClick={runTestSuite}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              Run Tests
            </button>
          ) : (
            <button
              onClick={stopTestSuite}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <StopIcon className="w-5 h-5 mr-2" />
              Stop Tests
            </button>
          )}
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Test Progress</h3>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {currentTest && (
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
              Running: {currentTest}
            </div>
          )}
        </div>
      )}

      {/* Test Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Passed</p>
              <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Running</p>
              <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Suites Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Suites</h3>
        <div className="space-y-6">
          {suites.map((suite) => (
            <div key={suite.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={suite.enabled}
                    onChange={() => toggleSuite(suite.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <h4 className="text-lg font-medium text-gray-900">{suite.name}</h4>
                    <p className="text-sm text-gray-600">{suite.description}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {suite.tests.filter(t => t.enabled).length}/{suite.tests.length} tests
                </span>
              </div>
              
              <div className="ml-7 space-y-2">
                {suite.tests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={test.enabled && suite.enabled}
                        onChange={() => toggleTest(suite.id, test.id)}
                        disabled={!suite.enabled}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className={`ml-2 text-sm ${suite.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                        {test.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(test.priority)}`}>
                        {test.priority}
                      </span>
                      <span className="text-xs text-gray-500">{test.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
        <div className="space-y-4">
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No test results yet</p>
          ) : (
            results.map((result) => (
              <TestResult key={result.id} result={result} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TestRunner;