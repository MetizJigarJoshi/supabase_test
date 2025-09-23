import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const ApiTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState({
    tableName: 'api_test',
    endpoint: '/rest/v1/',
    limit: 10,
    offset: 0
  });

  const results = getResultsByCategory('api');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `api-${testName}-${Date.now()}`;
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
        title: 'API Test Passed',
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
        title: 'API Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testRestGet = async () => {
    const { data, error } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .limit(apiConfig.limit);
    
    if (error) throw error;
    return { records: data?.length || 0, data };
  };

  const testRestPost = async () => {
    const newRecord = {
      name: `API Test Record ${Date.now()}`,
      description: 'Created via REST API test',
      value: Math.random() * 100
    };

    const { data, error } = await supabase
      .from(apiConfig.tableName)
      .insert([newRecord])
      .select();
    
    if (error) throw error;
    return data;
  };

  const testRestPatch = async () => {
    // First get a record to update
    const { data: records, error: selectError } = await supabase
      .from(apiConfig.tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) {
      throw new Error('No records found to update');
    }

    const { data, error } = await supabase
      .from(apiConfig.tableName)
      .update({ description: `Updated via API at ${new Date().toISOString()}` })
      .eq('id', records[0].id)
      .select();
    
    if (error) throw error;
    return data;
  };

  const testRestDelete = async () => {
    // First get a record to delete
    const { data: records, error: selectError } = await supabase
      .from(apiConfig.tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) {
      throw new Error('No records found to delete');
    }

    const { data, error } = await supabase
      .from(apiConfig.tableName)
      .delete()
      .eq('id', records[0].id)
      .select();
    
    if (error) throw error;
    return data;
  };

  const testPagination = async () => {
    const results = [];
    
    // Test first page
    const { data: page1, error: error1 } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .range(0, 4); // First 5 records
    
    if (error1) throw error1;
    results.push({ page: 1, records: page1?.length || 0 });

    // Test second page
    const { data: page2, error: error2 } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .range(5, 9); // Next 5 records
    
    if (error2) throw error2;
    results.push({ page: 2, records: page2?.length || 0 });

    return results;
  };

  const testFiltering = async () => {
    const filters = [];
    
    // Test equality filter
    const { data: eqData, error: eqError } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .eq('name', 'Test Record');
    
    if (eqError) throw eqError;
    filters.push({ filter: 'eq', results: eqData?.length || 0 });

    // Test greater than filter
    const { data: gtData, error: gtError } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .gt('value', 50);
    
    if (gtError) throw gtError;
    filters.push({ filter: 'gt', results: gtData?.length || 0 });

    // Test text search
    const { data: searchData, error: searchError } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .textSearch('description', 'test');
    
    if (searchError) throw searchError;
    filters.push({ filter: 'textSearch', results: searchData?.length || 0 });

    return filters;
  };

  const testOrdering = async () => {
    const orders = [];
    
    // Test ascending order
    const { data: ascData, error: ascError } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .order('created_at', { ascending: true })
      .limit(5);
    
    if (ascError) throw ascError;
    orders.push({ order: 'ascending', records: ascData?.length || 0 });

    // Test descending order
    const { data: descData, error: descError } = await supabase
      .from(apiConfig.tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (descError) throw descError;
    orders.push({ order: 'descending', records: descData?.length || 0 });

    return orders;
  };

  const testAggregation = async () => {
    // Test count
    const { count, error } = await supabase
      .from(apiConfig.tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return { total_records: count };
  };

  const testRawQuery = async () => {
    // Test raw SQL query using RPC
    const { data, error } = await supabase
      .rpc('get_table_info', { table_name: apiConfig.tableName });
    
    if (error) {
      // If RPC doesn't exist, fall back to regular query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(apiConfig.tableName)
        .select('*')
        .limit(1);
      
      if (fallbackError) throw fallbackError;
      return { fallback: true, sample_record: fallbackData?.[0] };
    }
    
    return data;
  };

  const testInvalidQuery = async () => {
    try {
      // Intentionally invalid query
      const { data, error } = await supabase
        .from('non_existent_table')
        .select('*');
      
      if (error) {
        return { 
          error_handled: true, 
          error_code: error.code,
          error_message: error.message 
        };
      }
      
      return { unexpected_success: true, data };
    } catch (error) {
      return { 
        error_caught: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const testLargePayload = async () => {
    // Create a large record
    const largeDescription = 'A'.repeat(10000); // 10KB string
    const largeRecord = {
      name: 'Large Payload Test',
      description: largeDescription,
      value: 999
    };

    const { data, error } = await supabase
      .from(apiConfig.tableName)
      .insert([largeRecord])
      .select();
    
    if (error) throw error;
    return { 
      record_created: true, 
      description_length: largeDescription.length,
      data 
    };
  };

  const testConcurrentRequests = async () => {
    const promises = [];
    const requestCount = 5;
    
    // Create multiple concurrent requests
    for (let i = 0; i < requestCount; i++) {
      promises.push(
        supabase
          .from(apiConfig.tableName)
          .insert([{
            name: `Concurrent Test ${i + 1}`,
            description: `Concurrent request ${i + 1}`,
            value: i * 10
          }])
          .select()
      );
    }
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    const successes = results.filter(r => !r.error);
    
    return {
      total_requests: requestCount,
      successful: successes.length,
      failed: errors.length,
      errors: errors.map(r => r.error?.message)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">API Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Name</label>
            <input
              type="text"
              value={apiConfig.tableName}
              onChange={(e) => setApiConfig({ ...apiConfig, tableName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Query Limit</label>
            <input
              type="number"
              value={apiConfig.limit}
              onChange={(e) => setApiConfig({ ...apiConfig, limit: parseInt(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* REST API Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">REST API Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => runTest('GET Request', testRestGet)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">GET Request</h4>
            <p className="text-sm text-gray-600 mt-1">Fetch records</p>
          </button>

          <button
            onClick={() => runTest('POST Request', testRestPost)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">POST Request</h4>
            <p className="text-sm text-gray-600 mt-1">Create record</p>
          </button>

          <button
            onClick={() => runTest('PATCH Request', testRestPatch)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">PATCH Request</h4>
            <p className="text-sm text-gray-600 mt-1">Update record</p>
          </button>

          <button
            onClick={() => runTest('DELETE Request', testRestDelete)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">DELETE Request</h4>
            <p className="text-sm text-gray-600 mt-1">Remove record</p>
          </button>
        </div>
      </div>

      {/* Query Features */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Pagination', testPagination)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Pagination</h4>
            <p className="text-sm text-gray-600 mt-1">Test range queries</p>
          </button>

          <button
            onClick={() => runTest('Filtering', testFiltering)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Filtering</h4>
            <p className="text-sm text-gray-600 mt-1">Test filter conditions</p>
          </button>

          <button
            onClick={() => runTest('Ordering', testOrdering)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Ordering</h4>
            <p className="text-sm text-gray-600 mt-1">Test sort operations</p>
          </button>

          <button
            onClick={() => runTest('Aggregation', testAggregation)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Aggregation</h4>
            <p className="text-sm text-gray-600 mt-1">Test count queries</p>
          </button>

          <button
            onClick={() => runTest('Raw Query', testRawQuery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Raw Query</h4>
            <p className="text-sm text-gray-600 mt-1">Test RPC functions</p>
          </button>
        </div>
      </div>

      {/* Error Handling & Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Handling & Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Invalid Query', testInvalidQuery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Invalid Query</h4>
            <p className="text-sm text-gray-600 mt-1">Test error handling</p>
          </button>

          <button
            onClick={() => runTest('Large Payload', testLargePayload)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Large Payload</h4>
            <p className="text-sm text-gray-600 mt-1">Test large data handling</p>
          </button>

          <button
            onClick={() => runTest('Concurrent Requests', testConcurrentRequests)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Concurrent Requests</h4>
            <p className="text-sm text-gray-600 mt-1">Test parallel operations</p>
          </button>
        </div>
      </div>

      {/* GraphQL Placeholder */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GraphQL (Placeholder)</h3>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-900">GraphQL Queries</h4>
          <p className="text-sm text-gray-600 mt-1">Enable GraphQL in Supabase dashboard to test GraphQL queries</p>
          <div className="mt-3 space-y-2">
            <code className="text-xs bg-gray-100 p-1 rounded block">
              query GetRecords {`{ ${apiConfig.tableName} { id name description } }`}
            </code>
            <code className="text-xs bg-gray-100 p-1 rounded block">
              mutation CreateRecord {`{ insert_${apiConfig.tableName}(objects: {...}) { returning { id } } }`}
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

export default ApiTests;