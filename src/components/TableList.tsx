import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Table {
  table_name: string;
  table_schema: string;
}

const TableList: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      // Query the information_schema to get list of tables in public schema
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error) {
        // If information_schema is not accessible, try alternative approach
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_public_tables');

        if (rpcError) {
          throw new Error('Unable to fetch tables. Make sure you have proper permissions.');
        }
        setTables(rpcData || []);
      } else {
        setTables(data || []);
      }
    } catch (err: any) {
      setError('Unable to fetch tables. Make sure you have proper permissions.');
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Database Tables</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Database Tables</h3>
        <button
          onClick={fetchTables}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {tables.length > 0 ? (
        <div className="space-y-2">
          {tables.map((table, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-gray-900">{table.table_name}</span>
                <span className="text-sm text-gray-500 ml-2">({table.table_schema})</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No tables found in public schema</p>
        </div>
      )}
    </div>
  );
};

export default TableList;