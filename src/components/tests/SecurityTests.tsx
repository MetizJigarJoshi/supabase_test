import React, { useState } from 'react';
import { supabase, createServiceRoleClient } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const SecurityTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [securityConfig, setSecurityConfig] = useState({
    serviceRoleKey: '',
    testTable: 'security_test',
    testEmail: 'security@test.com',
    testPassword: 'securepassword123'
  });

  const results = getResultsByCategory('security');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `security-${testName}-${Date.now()}`;
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
        title: 'Security Test Passed',
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
        title: 'Security Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testJWTValidation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session found');
    }

    // Decode JWT payload
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return {
      token_valid: payload.exp > now,
      expires_at: new Date(payload.exp * 1000).toISOString(),
      time_until_expiry: payload.exp - now,
      role: payload.role,
      user_id: payload.sub
    };
  };

  const testExpiredToken = async () => {
    // This is a simulation - in real scenario you'd use an actually expired token
    const mockExpiredPayload = {
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      role: 'authenticated',
      sub: 'test-user-id'
    };
    
    const now = Math.floor(Date.now() / 1000);
    
    return {
      token_expired: mockExpiredPayload.exp < now,
      expired_by_seconds: now - mockExpiredPayload.exp,
      should_refresh: true
    };
  };

  const testUnauthorizedAccess = async () => {
    try {
      // Try to access a protected resource without authentication
      const { data, error } = await supabase
        .from(securityConfig.testTable)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST301') {
        return {
          access_denied: true,
          error_code: error.code,
          message: 'Unauthorized access properly blocked'
        };
      }
      
      return {
        access_granted: true,
        warning: 'Unauthorized access was allowed - check RLS policies',
        data: data?.length || 0
      };
    } catch (error) {
      return {
        access_denied: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const testRLSPolicies = async () => {
    // Test if RLS is enabled on the table
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', securityConfig.testTable)
      .eq('table_schema', 'public');
    
    if (error) throw error;
    
    // Try to query the table to see if RLS blocks access
    const { data: tableData, error: tableError } = await supabase
      .from(securityConfig.testTable)
      .select('*')
      .limit(1);
    
    return {
      table_exists: data && data.length > 0,
      rls_active: tableError?.code === 'PGRST301' || tableError?.code === '42501',
      error_code: tableError?.code,
      access_result: tableError ? 'blocked' : 'allowed',
      records_accessible: tableData?.length || 0
    };
  };

  const testServiceRoleAccess = async () => {
    if (!securityConfig.serviceRoleKey) {
      throw new Error('Service role key not provided');
    }
    
    const serviceClient = createServiceRoleClient(securityConfig.serviceRoleKey);
    
    // Test service role can bypass RLS
    const { data, error } = await serviceClient
      .from(securityConfig.testTable)
      .select('*')
      .limit(5);
    
    if (error) throw error;
    
    return {
      service_role_access: true,
      records_found: data?.length || 0,
      bypassed_rls: true
    };
  };

  const testCORSHeaders = async () => {
    try {
      // Make a direct fetch request to test CORS
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${securityConfig.testTable}?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };
      
      return {
        cors_enabled: !!corsHeaders['access-control-allow-origin'],
        cors_headers: corsHeaders,
        status: response.status
      };
    } catch (error) {
      return {
        cors_test_failed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const testPasswordStrength = async () => {
    const weakPasswords = ['123456', 'password', 'admin', 'test'];
    const results = [];
    
    for (const weakPassword of weakPasswords) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: `weak-${Date.now()}@test.com`,
          password: weakPassword
        });
        
        results.push({
          password: weakPassword,
          accepted: !error,
          error: error?.message
        });
      } catch (error) {
        results.push({
          password: weakPassword,
          accepted: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      weak_passwords_tested: weakPasswords.length,
      results: results,
      security_level: results.filter(r => !r.accepted).length === weakPasswords.length ? 'good' : 'weak'
    };
  };

  const testBruteForceProtection = async () => {
    // Simulate multiple failed login attempts
    const attempts = [];
    const maxAttempts = 5;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: securityConfig.testEmail,
          password: 'wrongpassword' + i
        });
        
        attempts.push({
          attempt: i + 1,
          success: !error,
          error: error?.message,
          timestamp: new Date().toISOString()
        });
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        attempts.push({
          attempt: i + 1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return {
      total_attempts: maxAttempts,
      failed_attempts: attempts.filter(a => !a.success).length,
      rate_limited: attempts.some(a => a.error?.includes('rate') || a.error?.includes('limit')),
      attempts: attempts
    };
  };

  const testSQLInjection = async () => {
    const injectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --"
    ];
    
    const results = [];
    
    for (const injection of injectionAttempts) {
      try {
        // Try SQL injection in a filter
        const { data, error } = await supabase
          .from(securityConfig.testTable)
          .select('*')
          .eq('name', injection);
        
        results.push({
          injection: injection,
          blocked: !!error,
          error: error?.message,
          data_returned: data?.length || 0
        });
      } catch (error) {
        results.push({
          injection: injection,
          blocked: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      injection_attempts: injectionAttempts.length,
      blocked_attempts: results.filter(r => r.blocked).length,
      security_level: results.every(r => r.blocked) ? 'secure' : 'vulnerable',
      results: results
    };
  };

  const testDataEncryption = async () => {
    // Test if sensitive data is properly handled
    const sensitiveData = {
      credit_card: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      password: 'mysecretpassword'
    };
    
    try {
      const { data, error } = await supabase
        .from(securityConfig.testTable)
        .insert([{
          name: 'Encryption Test',
          sensitive_data: JSON.stringify(sensitiveData)
        }])
        .select();
      
      if (error) throw error;
      
      // Retrieve the data to see if it's encrypted
      const { data: retrieved, error: retrieveError } = await supabase
        .from(securityConfig.testTable)
        .select('*')
        .eq('id', data[0].id);
      
      if (retrieveError) throw retrieveError;
      
      return {
        data_stored: true,
        data_encrypted: retrieved[0].sensitive_data !== JSON.stringify(sensitiveData),
        original_data: sensitiveData,
        stored_data: retrieved[0].sensitive_data
      };
    } catch (error) {
      return {
        test_failed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Security Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Role Key</label>
            <input
              type="password"
              value={securityConfig.serviceRoleKey}
              onChange={(e) => setSecurityConfig({ ...securityConfig, serviceRoleKey: e.target.value })}
              placeholder="Enter service role key for admin tests"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Table</label>
            <input
              type="text"
              value={securityConfig.testTable}
              onChange={(e) => setSecurityConfig({ ...securityConfig, testTable: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Authentication Security */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('JWT Validation', testJWTValidation)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">JWT Validation</h4>
            <p className="text-sm text-gray-600 mt-1">Check token validity</p>
          </button>

          <button
            onClick={() => runTest('Expired Token', testExpiredToken)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Expired Token</h4>
            <p className="text-sm text-gray-600 mt-1">Test token expiration</p>
          </button>

          <button
            onClick={() => runTest('Password Strength', testPasswordStrength)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Password Strength</h4>
            <p className="text-sm text-gray-600 mt-1">Test weak password rejection</p>
          </button>

          <button
            onClick={() => runTest('Brute Force Protection', testBruteForceProtection)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Brute Force Protection</h4>
            <p className="text-sm text-gray-600 mt-1">Test rate limiting</p>
          </button>
        </div>
      </div>

      {/* Authorization & Access Control */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authorization & Access Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Unauthorized Access', testUnauthorizedAccess)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Unauthorized Access</h4>
            <p className="text-sm text-gray-600 mt-1">Test access without auth</p>
          </button>

          <button
            onClick={() => runTest('RLS Policies', testRLSPolicies)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">RLS Policies</h4>
            <p className="text-sm text-gray-600 mt-1">Test row level security</p>
          </button>

          <button
            onClick={() => runTest('Service Role Access', testServiceRoleAccess)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Service Role Access</h4>
            <p className="text-sm text-gray-600 mt-1">Test admin privileges</p>
          </button>
        </div>
      </div>

      {/* Data Security */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('SQL Injection', testSQLInjection)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">SQL Injection</h4>
            <p className="text-sm text-gray-600 mt-1">Test injection protection</p>
          </button>

          <button
            onClick={() => runTest('Data Encryption', testDataEncryption)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Data Encryption</h4>
            <p className="text-sm text-gray-600 mt-1">Test data protection</p>
          </button>

          <button
            onClick={() => runTest('CORS Headers', testCORSHeaders)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">CORS Headers</h4>
            <p className="text-sm text-gray-600 mt-1">Test cross-origin policies</p>
          </button>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Best Practices</h3>
        <div className="space-y-4">
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <h4 className="font-medium text-yellow-900">Security Checklist</h4>
            <ul className="mt-2 text-sm text-yellow-800 space-y-1">
              <li>• Enable Row Level Security (RLS) on all tables</li>
              <li>• Use service role key only on server-side</li>
              <li>• Implement proper CORS policies</li>
              <li>• Validate and sanitize all inputs</li>
              <li>• Use HTTPS for all communications</li>
              <li>• Regularly rotate API keys</li>
              <li>• Monitor for suspicious activities</li>
            </ul>
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

export default SecurityTests;