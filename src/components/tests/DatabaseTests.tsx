import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const DatabaseTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [testData, setTestData] = useState({
    tableName: 'test_table',
    recordCount: 10
  });

  const results = getResultsByCategory('database');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `database-${testName}-${Date.now()}`;
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
        title: 'Database Test Passed',
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
        title: 'Database Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testCreateTable = async () => {
    const { data, error } = await supabase.rpc('create_test_table', {
      table_name: testData.tableName
    });
    if (error) throw error;
    return data;
  };

  const testInsertRecord = async () => {
    const { data, error } = await supabase
      .from(testData.tableName)
      .insert([
        { name: 'Test Record', description: 'This is a test record', value: Math.random() * 100 }
      ])
      .select();
    if (error) throw error;
    return data;
  };

  const testSelectRecords = async () => {
    const { data, error } = await supabase
      .from(testData.tableName)
      .select('*')
      .limit(10);
    if (error) throw error;
    return data;
  };

  const testUpdateRecord = async () => {
    // First get a record to update
    const { data: records, error: selectError } = await supabase
      .from(testData.tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) throw new Error('No records to update');

    const { data, error } = await supabase
      .from(testData.tableName)
      .update({ description: 'Updated test record', updated_at: new Date().toISOString() })
      .eq('id', records[0].id)
      .select();
    
    if (error) throw error;
    return data;
  };

  const testDeleteRecord = async () => {
    // First get a record to delete
    const { data: records, error: selectError } = await supabase
      .from(testData.tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) throw new Error('No records to delete');

    const { data, error } = await supabase
      .from(testData.tableName)
      .delete()
      .eq('id', records[0].id)
      .select();
    
    if (error) throw error;
    return data;
  };

  const testComplexQuery = async () => {
    const { data, error } = await supabase
      .from(testData.tableName)
      .select('*')
      .gte('value', 50)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    return data;
  };

  const testBulkInsert = async () => {
    const records = Array.from({ length: testData.recordCount }, (_, i) => ({
      name: `Bulk Record ${i + 1}`,
      description: `Bulk inserted record number ${i + 1}`,
      value: Math.random() * 100
    }));

    const { data, error } = await supabase
      .from(testData.tableName)
      .insert(records)
      .select();
    
    if (error) throw error;
    return data;
  };

  const testTransaction = async () => {
    // Simulate transaction by performing multiple operations
    const operations = [];
    
    // Insert operation
    const { data: insertData, error: insertError } = await supabase
      .from(testData.tableName)
      .insert([{ name: 'Transaction Test', description: 'Part of transaction', value: 99 }])
      .select();
    
    if (insertError) throw insertError;
    operations.push({ operation: 'insert', result: insertData });

    // Update operation
    const { data: updateData, error: updateError } = await supabase
      .from(testData.tableName)
      .update({ description: 'Updated in transaction' })
      .eq('id', insertData[0].id)
      .select();
    
    if (updateError) throw updateError;
    operations.push({ operation: 'update', result: updateData });

    return operations;
  };

  const testListTables = async () => {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (error) throw error;
    return data;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Database Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Name</label>
            <input
              type="text"
              value={testData.tableName}
              onChange={(e) => setTestData({ ...testData, tableName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bulk Insert Count</label>
            <input
              type="number"
              value={testData.recordCount}
              onChange={(e) => setTestData({ ...testData, recordCount: parseInt(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* CRUD Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CRUD Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Create Table', testCreateTable)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Create Table</h4>
            <p className="text-sm text-gray-600 mt-1">Create test table structure</p>
          </button>

          <button
            onClick={() => runTest('Insert Record', testInsertRecord)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Insert Record</h4>
            <p className="text-sm text-gray-600 mt-1">Add single record</p>
          </button>

          <button
            onClick={() => runTest('Select Records', testSelectRecords)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Select Records</h4>
            <p className="text-sm text-gray-600 mt-1">Query table data</p>
          </button>

          <button
            onClick={() => runTest('Update Record', testUpdateRecord)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Update Record</h4>
            <p className="text-sm text-gray-600 mt-1">Modify existing record</p>
          </button>

          <button
            onClick={() => runTest('Delete Record', testDeleteRecord)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Delete Record</h4>
            <p className="text-sm text-gray-600 mt-1">Remove record from table</p>
          </button>

          <button
            onClick={() => runTest('List Tables', testListTables)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">List Tables</h4>
            <p className="text-sm text-gray-600 mt-1">Get all database tables</p>
          </button>
        </div>
      </div>

      {/* Advanced Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Complex Query', testComplexQuery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Complex Query</h4>
            <p className="text-sm text-gray-600 mt-1">Filter, sort, and limit results</p>
          </button>

          <button
            onClick={() => runTest('Bulk Insert', testBulkInsert)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Bulk Insert</h4>
            <p className="text-sm text-gray-600 mt-1">Insert multiple records</p>
          </button>

          <button
            onClick={() => runTest('Transaction Test', testTransaction)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Transaction Test</h4>
            <p className="text-sm text-gray-600 mt-1">Multiple operations</p>
          </button>
        </div>
      </div>

      {/* RLS Testing Placeholder */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Row Level Security (RLS)</h3>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium text-gray-900">RLS Policy Testing</h4>
          <p className="text-sm text-gray-600 mt-1">Configure RLS policies in Supabase dashboard first</p>
          <div className="mt-3 space-y-2">
            <code className="text-xs bg-gray-100 p-1 rounded block">
              ALTER TABLE {testData.tableName} ENABLE ROW LEVEL SECURITY;
            </code>
            <code className="text-xs bg-gray-100 p-1 rounded block">
              CREATE POLICY "Users can view own records" ON {testData.tableName} FOR SELECT USING (auth.uid() = user_id);
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

export default DatabaseTests;