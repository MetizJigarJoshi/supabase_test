import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import StatCard from './ui/StatCard';
import TopBar from './ui/TopBar';
import QuickActions from './ui/QuickActions';
import EnvironmentInfo from './ui/EnvironmentInfo';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp 
} from 'lucide-react';

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
    totalTests: 127,
    passedTests: 98,
    failedTests: 12,
    pendingTests: 17
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

      // Test connection using a simple RPC call or auth endpoint
      const { data, error } = await supabase.auth.getSession();

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

  const successRate = Math.round((stats.passedTests / stats.totalTests) * 100);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      <TopBar 
        connectionStatus={connectionStatus.status} 
        onTestConnection={testConnection} 
      />
      
      <main className="p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Testing Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and test your Supabase instance across all services
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Tests"
              value={stats.totalTests}
              icon={TestTube}
              color="blue"
              trend={{ value: 12, isPositive: true }}
              delay={0}
            />
            <StatCard
              title="Passed Tests"
              value={stats.passedTests}
              icon={CheckCircle}
              color="green"
              trend={{ value: 8, isPositive: true }}
              delay={0.1}
            />
            <StatCard
              title="Failed Tests"
              value={stats.failedTests}
              icon={XCircle}
              color="red"
              trend={{ value: 3, isPositive: false }}
              delay={0.2}
            />
            <StatCard
              title="Success Rate"
              value={`${successRate}%`}
              icon={TrendingUp}
              color="purple"
              trend={{ value: 5, isPositive: true }}
              delay={0.3}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - 2/3 width */}
            <div className="space-y-8 lg:col-span-2">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </h2>
                <QuickActions />
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Test Activity
                </h3>
                <div className="space-y-3">
                  {[
                    { test: 'Authentication Flow', status: 'passed', time: '2 minutes ago' },
                    { test: 'Database CRUD Operations', status: 'passed', time: '5 minutes ago' },
                    { test: 'Storage Upload Test', status: 'failed', time: '8 minutes ago' },
                    { test: 'Realtime Subscriptions', status: 'passed', time: '12 minutes ago' },
                  ].map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`h-2 w-2 rounded-full ${
                          activity.status === 'passed' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.test}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-8">
              {/* Environment Info */}
              <EnvironmentInfo
                supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
                anonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
              />

              {/* Connection Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  System Status
                </h3>
                <div className="space-y-3">
                  {[
                    { service: 'Database', status: 'operational' },
                    { service: 'Authentication', status: 'operational' },
                    { service: 'Storage', status: 'operational' },
                    { service: 'Realtime', status: 'operational' },
                    { service: 'Edge Functions', status: 'degraded' },
                  ].map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {service.service}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        service.status === 'operational'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}>
                        {service.status}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;