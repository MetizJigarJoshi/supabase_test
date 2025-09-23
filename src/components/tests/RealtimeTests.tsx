import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  table: string;
  payload: any;
}

const RealtimeTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [tableName, setTableName] = useState('realtime_test');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const results = getResultsByCategory('realtime');

  useEffect(() => {
    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `realtime-${testName}-${Date.now()}`;
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
        title: 'Realtime Test Passed',
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
        title: 'Realtime Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const addEvent = (eventType: string, table: string, payload: any) => {
    const event: RealtimeEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      eventType,
      table,
      payload
    };
    setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
  };

  const testSubscribeToTable = async () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    setConnectionStatus('connecting');
    
    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          addEvent(payload.eventType, tableName, payload);
          addNotification({
            type: 'info',
            title: 'Realtime Event',
            message: `${payload.eventType} event received from ${tableName}`
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setIsSubscribed(true);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          setIsSubscribed(false);
        }
      });

    channelRef.current = channel;
    
    return { status: 'subscribed', table: tableName };
  };

  const testUnsubscribe = async () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsSubscribed(false);
    setConnectionStatus('disconnected');
    return { status: 'unsubscribed' };
  };

  const testInsertTrigger = async () => {
    const testRecord = {
      name: `Realtime Test ${Date.now()}`,
      description: 'This record should trigger a realtime event',
      value: Math.random() * 100
    };

    const { data, error } = await supabase
      .from(tableName)
      .insert([testRecord])
      .select();

    if (error) throw error;
    return data;
  };

  const testUpdateTrigger = async () => {
    // First get a record to update
    const { data: records, error: selectError } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) {
      throw new Error('No records found to update. Insert a record first.');
    }

    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        description: `Updated at ${new Date().toISOString()}`,
        value: Math.random() * 100
      })
      .eq('id', records[0].id)
      .select();

    if (error) throw error;
    return data;
  };

  const testDeleteTrigger = async () => {
    // First get a record to delete
    const { data: records, error: selectError } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (selectError) throw selectError;
    if (!records || records.length === 0) {
      throw new Error('No records found to delete. Insert a record first.');
    }

    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', records[0].id)
      .select();

    if (error) throw error;
    return data;
  };

  const testFilteredSubscription = async () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    setConnectionStatus('connecting');
    
    const channel = supabase
      .channel(`filtered:${tableName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: 'value=gt.50' // Only listen to records where value > 50
        },
        (payload) => {
          addEvent(`FILTERED_${payload.eventType}`, tableName, payload);
          addNotification({
            type: 'info',
            title: 'Filtered Realtime Event',
            message: `Filtered ${payload.eventType} event (value > 50)`
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setIsSubscribed(true);
        }
      });

    channelRef.current = channel;
    
    return { status: 'subscribed', filter: 'value > 50' };
  };

  const testMultipleSubscriptions = async () => {
    // Create multiple channels for different events
    const channels = [];
    
    for (let i = 0; i < 3; i++) {
      const channel = supabase
        .channel(`multi-${i}:${tableName}`)
        .on(
          'postgres_changes',
          {
            event: i === 0 ? 'INSERT' : i === 1 ? 'UPDATE' : 'DELETE',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            addEvent(`MULTI_${payload.eventType}`, tableName, payload);
          }
        )
        .subscribe();
      
      channels.push(channel);
    }
    
    // Store reference to first channel for cleanup
    channelRef.current = channels[0];
    
    return { channels: channels.length, events: ['INSERT', 'UPDATE', 'DELETE'] };
  };

  const testConnectionStatus = async () => {
    const status = supabase.realtime.isConnected();
    const channels = supabase.realtime.channels;
    
    return {
      connected: status,
      channels: channels.length,
      channel_details: channels.map(ch => ({
        topic: ch.topic,
        state: ch.state
      }))
    };
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Realtime Tests</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Name</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subscription Status</label>
            <p className={`mt-1 text-sm font-medium ${isSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
              {isSubscribed ? 'Subscribed' : 'Not subscribed'}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Subscribe to Table', testSubscribeToTable)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Subscribe to Table</h4>
            <p className="text-sm text-gray-600 mt-1">Listen to all table changes</p>
          </button>

          <button
            onClick={() => runTest('Filtered Subscription', testFilteredSubscription)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Filtered Subscription</h4>
            <p className="text-sm text-gray-600 mt-1">Listen with filter conditions</p>
          </button>

          <button
            onClick={() => runTest('Multiple Subscriptions', testMultipleSubscriptions)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Multiple Subscriptions</h4>
            <p className="text-sm text-gray-600 mt-1">Multiple event listeners</p>
          </button>

          <button
            onClick={() => runTest('Connection Status', testConnectionStatus)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Connection Status</h4>
            <p className="text-sm text-gray-600 mt-1">Check realtime connection</p>
          </button>

          <button
            onClick={() => runTest('Unsubscribe', testUnsubscribe)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Unsubscribe</h4>
            <p className="text-sm text-gray-600 mt-1">Stop listening to events</p>
          </button>
        </div>
      </div>

      {/* Event Triggers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Triggers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Trigger Insert', testInsertTrigger)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Trigger Insert</h4>
            <p className="text-sm text-gray-600 mt-1">Insert record to trigger event</p>
          </button>

          <button
            onClick={() => runTest('Trigger Update', testUpdateTrigger)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Trigger Update</h4>
            <p className="text-sm text-gray-600 mt-1">Update record to trigger event</p>
          </button>

          <button
            onClick={() => runTest('Trigger Delete', testDeleteTrigger)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Trigger Delete</h4>
            <p className="text-sm text-gray-600 mt-1">Delete record to trigger event</p>
          </button>
        </div>
      </div>

      {/* Live Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Events ({events.length})</h3>
          <button
            onClick={clearEvents}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Events
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No realtime events received yet</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-gray-900">{event.eventType}</span>
                    <span className="text-sm text-gray-600 ml-2">on {event.table}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {event.payload && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
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

export default RealtimeTests;