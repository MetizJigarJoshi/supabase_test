import React from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export interface TestResultData {
  id: string;
  name: string;
  status: 'success' | 'error' | 'pending' | 'running';
  message?: string;
  duration?: number;
  timestamp: Date;
  details?: any;
}

interface TestResultProps {
  result: TestResultData;
  onRetry?: () => void;
}

const TestResult: React.FC<TestResultProps> = ({ result, onRetry }) => {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
        return <ClockIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'pending':
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{result.name}</h4>
            {result.message && (
              <p className="text-sm text-gray-600 mt-1">{result.message}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>{result.timestamp.toLocaleTimeString()}</span>
              {result.duration && <span>{result.duration}ms</span>}
            </div>
          </div>
        </div>
        {result.status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        )}
      </div>
      
      {result.details && (
        <div className="mt-3 p-3 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
          <pre>{JSON.stringify(result.details, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestResult;