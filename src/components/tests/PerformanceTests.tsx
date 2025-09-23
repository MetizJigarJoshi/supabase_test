import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

interface PerformanceMetrics {
  duration: number;
  throughput?: number;
  memory?: number;
  errors?: number;
}

const PerformanceTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [perfConfig, setPerfConfig] = useState({
    tableName: 'performance_test',
    recordCount: 100,
    concurrentUsers: 10,
    queryComplexity: 'simple'
  });

  const results = getResultsByCategory('performance');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `performance-${testName}-${Date.now()}`;
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
        message: `Completed in ${duration}ms`,
        duration,
        timestamp: new Date(),
        details: result
      });
      
      addNotification({
        type: 'success',
        title: 'Performance Test Completed',
        message: `${testName} finished in ${duration}ms`
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
        title: 'Performance Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const measurePerformance = async (operation: () => Promise<any>): Promise<PerformanceMetrics> => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      return {
        duration: endTime - startTime,
        memory: endMemory - startMemory,
        errors: 0
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        duration: endTime - startTime,
        errors: 1
      };
    }
  };

  const testSingleQuery = async () => {
    const metrics = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from(perfConfig.tableName)
        .select('*')
        .limit(10);
      
      if (error) throw error;
      return data;
    });
    
    return {
      test_type: 'single_query',
      metrics,
      records_fetched: 10
    };
  };

  const testBulkInsert = async () => {
    const records = Array.from({ length: perfConfig.recordCount }, (_, i) => ({
      name: `Performance Test Record ${i + 1}`,
      description: `Bulk insert test record ${i + 1}`,
      value: Math.random() * 1000,
      created_at: new Date().toISOString()
    }));

    const metrics = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from(perfConfig.tableName)
        .insert(records)
        .select();
      
      if (error) throw error;
      return data;
    });
    
    return {
      test_type: 'bulk_insert',
      records_inserted: perfConfig.recordCount,
      metrics,
      throughput: perfConfig.recordCount / (metrics.duration / 1000) // records per second
    };
  };

  const testConcurrentQueries = async () => {
    const queries = Array.from({ length: perfConfig.concurrentUsers }, (_, i) => 
      supabase
        .from(perfConfig.tableName)
        .select('*')
        .range(i * 10, (i + 1) * 10 - 1)
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(queries);
    const endTime = performance.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      test_type: 'concurrent_queries',
      concurrent_users: perfConfig.concurrentUsers,
      successful_queries: successful,
      failed_queries: failed,
      total_duration: endTime - startTime,
      average_query_time: (endTime - startTime) / perfConfig.concurrentUsers
    };
  };

  const testLongRunningQuery = async () => {
    // Simulate a complex query with joins and aggregations
    const metrics = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from(perfConfig.tableName)
        .select('*')
        .gte('value', 0)
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data;
    });
    
    return {
      test_type: 'long_running_query',
      metrics,
      records_processed: 1000,
      performance_rating: metrics.duration < 1000 ? 'excellent' : 
                         metrics.duration < 3000 ? 'good' : 
                         metrics.duration < 5000 ? 'fair' : 'poor'
    };
  };

  const testPaginationPerformance = async () => {
    const pageSize = 50;
    const totalPages = 10;
    const pageResults = [];
    
    const startTime = performance.now();
    
    for (let page = 0; page < totalPages; page++) {
      const pageStart = performance.now();
      
      const { data, error } = await supabase
        .from(perfConfig.tableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      const pageEnd = performance.now();
      
      if (error) throw error;
      
      pageResults.push({
        page: page + 1,
        records: data?.length || 0,
        duration: pageEnd - pageStart
      });
    }
    
    const endTime = performance.now();
    
    return {
      test_type: 'pagination_performance',
      total_pages: totalPages,
      page_size: pageSize,
      total_duration: endTime - startTime,
      average_page_time: pageResults.reduce((sum, p) => sum + p.duration, 0) / totalPages,
      page_results: pageResults
    };
  };

  const testMemoryUsage = async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Perform memory-intensive operations
    const largeDataSets = [];
    
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from(perfConfig.tableName)
        .select('*')
        .limit(200);
      
      if (error) throw error;
      largeDataSets.push(data);
    }
    
    const peakMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Clear references
    largeDataSets.length = 0;
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      test_type: 'memory_usage',
      initial_memory: initialMemory,
      peak_memory: peakMemory,
      final_memory: finalMemory,
      memory_increase: peakMemory - initialMemory,
      memory_freed: peakMemory - finalMemory,
      memory_efficiency: ((peakMemory - finalMemory) / (peakMemory - initialMemory)) * 100
    };
  };

  const testConnectionPooling = async () => {
    const connectionTests = [];
    const maxConnections = 20;
    
    // Create multiple simultaneous connections
    const promises = Array.from({ length: maxConnections }, async (_, i) => {
      const startTime = performance.now();
      
      try {
        const { data, error } = await supabase
          .from(perfConfig.tableName)
          .select('count(*)')
          .single();
        
        const endTime = performance.now();
        
        return {
          connection: i + 1,
          success: !error,
          duration: endTime - startTime,
          error: error?.message
        };
      } catch (error) {
        const endTime = performance.now();
        return {
          connection: i + 1,
          success: false,
          duration: endTime - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    const results = await Promise.all(promises);
    
    return {
      test_type: 'connection_pooling',
      total_connections: maxConnections,
      successful_connections: results.filter(r => r.success).length,
      failed_connections: results.filter(r => !r.success).length,
      average_connection_time: results.reduce((sum, r) => sum + r.duration, 0) / maxConnections,
      connection_results: results
    };
  };

  const testQueryOptimization = async () => {
    const queries = [
      {
        name: 'Simple Select',
        query: () => supabase.from(perfConfig.tableName).select('id, name').limit(100)
      },
      {
        name: 'Filtered Query',
        query: () => supabase.from(perfConfig.tableName).select('*').gt('value', 500).limit(100)
      },
      {
        name: 'Ordered Query',
        query: () => supabase.from(perfConfig.tableName).select('*').order('created_at', { ascending: false }).limit(100)
      },
      {
        name: 'Complex Filter',
        query: () => supabase.from(perfConfig.tableName).select('*').gte('value', 100).lte('value', 900).order('value').limit(100)
      }
    ];
    
    const results = [];
    
    for (const queryTest of queries) {
      const startTime = performance.now();
      
      try {
        const { data, error } = await queryTest.query();
        const endTime = performance.now();
        
        if (error) throw error;
        
        results.push({
          query_name: queryTest.name,
          duration: endTime - startTime,
          records_returned: data?.length || 0,
          success: true
        });
      } catch (error) {
        const endTime = performance.now();
        
        results.push({
          query_name: queryTest.name,
          duration: endTime - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      test_type: 'query_optimization',
      queries_tested: queries.length,
      results: results,
      fastest_query: results.reduce((min, r) => r.duration < min.duration ? r : min, results[0]),
      slowest_query: results.reduce((max, r) => r.duration > max.duration ? r : max, results[0])
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Performance Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Name</label>
            <input
              type="text"
              value={perfConfig.tableName}
              onChange={(e) => setPerfConfig({ ...perfConfig, tableName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Record Count</label>
            <input
              type="number"
              value={perfConfig.recordCount}
              onChange={(e) => setPerfConfig({ ...perfConfig, recordCount: parseInt(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Concurrent Users</label>
            <input
              type="number"
              value={perfConfig.concurrentUsers}
              onChange={(e) => setPerfConfig({ ...perfConfig, concurrentUsers: parseInt(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Query Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Single Query', testSingleQuery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Single Query</h4>
            <p className="text-sm text-gray-600 mt-1">Measure single query performance</p>
          </button>

          <button
            onClick={() => runTest('Long Running Query', testLongRunningQuery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Long Running Query</h4>
            <p className="text-sm text-gray-600 mt-1">Test complex query performance</p>
          </button>

          <button
            onClick={() => runTest('Query Optimization', testQueryOptimization)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Query Optimization</h4>
            <p className="text-sm text-gray-600 mt-1">Compare query strategies</p>
          </button>

          <button
            onClick={() => runTest('Pagination Performance', testPaginationPerformance)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Pagination Performance</h4>
            <p className="text-sm text-gray-600 mt-1">Test paginated queries</p>
          </button>
        </div>
      </div>

      {/* Throughput & Concurrency */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Throughput & Concurrency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Bulk Insert', testBulkInsert)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Bulk Insert</h4>
            <p className="text-sm text-gray-600 mt-1">Test bulk data insertion</p>
          </button>

          <button
            onClick={() => runTest('Concurrent Queries', testConcurrentQueries)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Concurrent Queries</h4>
            <p className="text-sm text-gray-600 mt-1">Test multiple simultaneous queries</p>
          </button>

          <button
            onClick={() => runTest('Connection Pooling', testConnectionPooling)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Connection Pooling</h4>
            <p className="text-sm text-gray-600 mt-1">Test connection management</p>
          </button>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => runTest('Memory Usage', testMemoryUsage)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Memory Usage</h4>
            <p className="text-sm text-gray-600 mt-1">Monitor memory consumption</p>
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <h4 className="font-medium text-green-900">Excellent Performance</h4>
            <ul className="mt-2 text-sm text-green-800 space-y-1">
              <li>• Query time: &lt; 100ms</li>
              <li>• Throughput: &gt; 1000 ops/sec</li>
              <li>• Memory usage: &lt; 50MB</li>
            </ul>
          </div>
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <h4 className="font-medium text-yellow-900">Good Performance</h4>
            <ul className="mt-2 text-sm text-yellow-800 space-y-1">
              <li>• Query time: 100-500ms</li>
              <li>• Throughput: 500-1000 ops/sec</li>
              <li>• Memory usage: 50-100MB</li>
            </ul>
          </div>
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <h4 className="font-medium text-red-900">Needs Optimization</h4>
            <ul className="mt-2 text-sm text-red-800 space-y-1">
              <li>• Query time: &gt; 500ms</li>
              <li>• Throughput: &lt; 500 ops/sec</li>
              <li>• Memory usage: &gt; 100MB</li>
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

export default PerformanceTests;