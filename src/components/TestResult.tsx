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
        return 'border-green-200 bg-gradient-to-r from-green-50 to-green-100';
      case 'error':
        return 'border-red-200 bg-gradient-to-r from-red-50 to-red-100';
      case 'running':
        return 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100';
      case 'pending':
        return 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`card p-4 ${getStatusColor()} animate-fade-in`}>
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
            className="btn btn-primary text-xs"
          >
            Retry
          </button>
        )}
      </div>
      
      {result.details && (
        <div className="mt-3 p-3 bg-gray-900 text-green-400 rounded-lg text-xs font-mono overflow-x-auto">
          <pre>{JSON.stringify(result.details, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestResult;