import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const AuthTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [testUser, setTestUser] = useState({
    email: 'test@example.com',
    password: 'testpassword123'
  });

  const results = getResultsByCategory('auth');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `auth-${testName}-${Date.now()}`;
    setLoading(testId);
    
    addResult({
      id: testId,
      name: testName,
      status: 'running',
      timestamp: new Date()
    });

    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      addResult({
        id: testId,
        name: testName,
        status: 'success',
        message: 'Test completed successfully',
        duration,
        timestamp: new Date(),
        details: result
      });
      
      addNotification({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      addResult({
        id: testId,
        name: testName,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date(),
        details: error
      });
      
      addNotification({
        type: 'error',
        title: 'Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testSignUp = async () => {
    return await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    });
  };

  const testSignIn = async () => {
    return await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
  };

  const testSignOut = async () => {
    return await supabase.auth.signOut();
  };

  const testGetSession = async () => {
    return await supabase.auth.getSession();
  };

  const testGetUser = async () => {
    return await supabase.auth.getUser();
  };

  const testPasswordReset = async () => {
    return await supabase.auth.resetPasswordForEmail(testUser.email);
  };

  const testJWTValidation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    
    // Decode JWT to check expiration
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return {
      token: session.access_token,
      expires_at: payload.exp,
      current_time: now,
      is_valid: payload.exp > now,
      time_until_expiry: payload.exp - now
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Authentication Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Email</label>
            <input
              type="email"
              value={testUser.email}
              onChange={(e) => setTestUser({ ...testUser, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Password</label>
            <input
              type="password"
              value={testUser.password}
              onChange={(e) => setTestUser({ ...testUser, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Sign Up', testSignUp)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Sign Up</h4>
            <p className="text-sm text-gray-600 mt-1">Create new user account</p>
          </button>

          <button
            onClick={() => runTest('Sign In', testSignIn)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Sign In</h4>
            <p className="text-sm text-gray-600 mt-1">Authenticate user</p>
          </button>

          <button
            onClick={() => runTest('Sign Out', testSignOut)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Sign Out</h4>
            <p className="text-sm text-gray-600 mt-1">End user session</p>
          </button>

          <button
            onClick={() => runTest('Get Session', testGetSession)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Get Session</h4>
            <p className="text-sm text-gray-600 mt-1">Retrieve current session</p>
          </button>

          <button
            onClick={() => runTest('Get User', testGetUser)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Get User</h4>
            <p className="text-sm text-gray-600 mt-1">Get current user info</p>
          </button>

          <button
            onClick={() => runTest('Password Reset', testPasswordReset)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Password Reset</h4>
            <p className="text-sm text-gray-600 mt-1">Send reset email</p>
          </button>

          <button
            onClick={() => runTest('JWT Validation', testJWTValidation)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">JWT Validation</h4>
            <p className="text-sm text-gray-600 mt-1">Check token validity</p>
          </button>
        </div>
      </div>

      {/* Social Login Placeholders */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Authentication (Placeholder)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-medium text-gray-900">Google OAuth</h4>
            <p className="text-sm text-gray-600 mt-1">Configure Google provider in Supabase dashboard</p>
            <code className="text-xs bg-gray-100 p-1 rounded mt-2 block">
              supabase.auth.signInWithOAuth({`{ provider: 'google' }`})
            </code>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-medium text-gray-900">GitHub OAuth</h4>
            <p className="text-sm text-gray-600 mt-1">Configure GitHub provider in Supabase dashboard</p>
            <code className="text-xs bg-gray-100 p-1 rounded mt-2 block">
              supabase.auth.signInWithOAuth({`{ provider: 'github' }`})
            </code>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
        <div className="space-y-4">
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tests run yet</p>
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

export default AuthTests;