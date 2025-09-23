import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TestCard from './TestCard';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'testing';
  message: string;
  timestamp: Date;
}

const Dashboard: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'testing',
    message: 'Testing connection...',
    timestamp: new Date()
  });

  const [stats, setStats] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0
  });

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus({
        status: 'testing',
        message: 'Testing connection...',
        timestamp: new Date()
      });

      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        setConnectionStatus({
          status: 'disconnected',
          message: `Connection failed: ${error.message}`,
          timestamp: new Date()
        });
      } else {
        setConnectionStatus({
          status: 'connected',
          message: 'Successfully connected to Supabase',
          timestamp: new Date()
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'disconnected',
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'testing':
        return <ClockIcon className="w-6 h-6 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'disconnected':
        return 'bg-red-50 border-red-200';
      case 'testing':
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gradient">Dashboard</h1>
        <button
          onClick={testConnection}
          className="btn btn-primary"
        >
          Test Connection
        </button>
      </div>

      {/* Connection Status */}
      <div className={`card ${getStatusColor()}`}>
        <div className="card-body">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Connection Status</h3>
            <p className="text-gray-700">{connectionStatus.message}</p>
            <p className="text-sm text-gray-500">
              Last checked: {connectionStatus.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Test Statistics */}
      <div className="grid grid-cols-4 gap-6">
        <TestCard
          title="Total Tests"
          value={stats.totalTests}
          icon={<ClockIcon className="w-8 h-8 text-blue-500" />}
          color="blue"
        />
        <TestCard
          title="Passed"
          value={stats.passedTests}
          icon={<CheckCircleIcon className="w-8 h-8 text-green-500" />}
          color="green"
        />
        <TestCard
          title="Failed"
          value={stats.failedTests}
          icon={<XCircleIcon className="w-8 h-8 text-red-500" />}
          color="red"
        />
        <TestCard
          title="Pending"
          value={stats.pendingTests}
          icon={<ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />}
          color="yellow"
        />
      </div>

      {/* Environment Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Environment Information</h3>
        </div>
        <div className="card-body">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Supabase URL</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-3 rounded-lg border">
              {import.meta.env.VITE_SUPABASE_URL}
            </p>
          </div>
          <div>
            <label className="form-label">Anonymous Key</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-3 rounded-lg border truncate">
              {import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 50)}...
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
        <div className="grid grid-cols-3 gap-4">
          <button className="card p-4 text-left hover:shadow-lg transition-all">
            <h4 className="font-medium text-gray-900">Run All Tests</h4>
            <p className="text-sm text-gray-600 mt-1">Execute complete test suite</p>
          </button>
          <button className="card p-4 text-left hover:shadow-lg transition-all">
            <h4 className="font-medium text-gray-900">Health Check</h4>
            <p className="text-sm text-gray-600 mt-1">Verify all services are running</p>
          </button>
          <button className="card p-4 text-left hover:shadow-lg transition-all">
            <h4 className="font-medium text-gray-900">Generate Report</h4>
            <p className="text-sm text-gray-600 mt-1">Export test results</p>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;