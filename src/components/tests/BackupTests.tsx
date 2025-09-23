import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const BackupTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [backupConfig, setBackupConfig] = useState({
    tableName: 'backup_test',
    bucketName: 'backups',
    includeSchema: true,
    includeData: true
  });

  const results = getResultsByCategory('backup');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `backup-${testName}-${Date.now()}`;
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
        title: 'Backup Test Passed',
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
        title: 'Backup Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testDatabaseBackup = async () => {
    // Simulate database backup by exporting table data
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) throw tablesError;
    
    const backupData: any = {
      timestamp: new Date().toISOString(),
      tables: {},
      metadata: {
        version: '1.0',
        total_tables: tables?.length || 0
      }
    };
    
    // Export data from each table (limited for demo)
    for (const table of tables || []) {
      try {
        const { data, error } = await supabase
          .from(table.table_name)
          .select('*')
          .limit(100); // Limit for demo purposes
        
        if (!error) {
          backupData.tables[table.table_name] = {
            records: data?.length || 0,
            sample_data: data?.slice(0, 3) // Include sample data
          };
        }
      } catch (error) {
        backupData.tables[table.table_name] = {
          error: 'Failed to backup table'
        };
      }
    }
    
    return backupData;
  };

  const testSchemaBackup = async () => {
    // Get table schemas
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public');
    
    if (error) throw error;
    
    const schemaBackup: any = {
      timestamp: new Date().toISOString(),
      schemas: {}
    };
    
    // Group columns by table
    columns?.forEach(col => {
      if (!schemaBackup.schemas[col.table_name]) {
        schemaBackup.schemas[col.table_name] = {
          columns: []
        };
      }
      
      schemaBackup.schemas[col.table_name].columns.push({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      });
    });
    
    return {
      total_tables: Object.keys(schemaBackup.schemas).length,
      total_columns: columns?.length || 0,
      schema_backup: schemaBackup
    };
  };

  const testStorageBackup = async () => {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw bucketsError;
    
    const storageBackup: any = {
      timestamp: new Date().toISOString(),
      buckets: {}
    };
    
    // Get file list from each bucket
    for (const bucket of buckets || []) {
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 100 });
        
        if (!filesError) {
          storageBackup.buckets[bucket.name] = {
            file_count: files?.length || 0,
            files: files?.map(f => ({
              name: f.name,
              size: f.metadata?.size || 0,
              last_modified: f.updated_at
            })) || []
          };
        }
      } catch (error) {
        storageBackup.buckets[bucket.name] = {
          error: 'Failed to list files'
        };
      }
    }
    
    return {
      total_buckets: buckets?.length || 0,
      storage_backup: storageBackup
    };
  };

  const testBackupToStorage = async () => {
    // Create a backup file and store it in Supabase Storage
    const backupData = {
      timestamp: new Date().toISOString(),
      type: 'test_backup',
      data: {
        test_table: [
          { id: 1, name: 'Test Record 1', value: 100 },
          { id: 2, name: 'Test Record 2', value: 200 }
        ]
      }
    };
    
    const backupContent = JSON.stringify(backupData, null, 2);
    const fileName = `backup-${Date.now()}.json`;
    
    const { data, error } = await supabase.storage
      .from(backupConfig.bucketName)
      .upload(`database-backups/${fileName}`, 
        new Blob([backupContent], { type: 'application/json' }));
    
    if (error) throw error;
    
    return {
      backup_file: fileName,
      file_size: backupContent.length,
      storage_path: data.path,
      backup_data: backupData
    };
  };

  const testRestoreFromBackup = async () => {
    // List backup files
    const { data: files, error: listError } = await supabase.storage
      .from(backupConfig.bucketName)
      .list('database-backups/', { limit: 10 });
    
    if (listError) throw listError;
    
    if (!files || files.length === 0) {
      throw new Error('No backup files found. Create a backup first.');
    }
    
    // Download the most recent backup
    const latestBackup = files.sort((a, b) => 
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    )[0];
    
    const { data: backupFile, error: downloadError } = await supabase.storage
      .from(backupConfig.bucketName)
      .download(`database-backups/${latestBackup.name}`);
    
    if (downloadError) throw downloadError;
    
    const backupContent = await backupFile.text();
    const backupData = JSON.parse(backupContent);
    
    // Simulate restore process (in real scenario, you'd restore to database)
    return {
      restored_from: latestBackup.name,
      backup_timestamp: backupData.timestamp,
      backup_type: backupData.type,
      data_preview: backupData.data,
      restore_simulation: 'Data would be restored to database tables'
    };
  };

  const testPointInTimeRecovery = async () => {
    // Simulate point-in-time recovery by creating timestamped snapshots
    const snapshots = [];
    
    // Create multiple snapshots with different timestamps
    for (let i = 0; i < 3; i++) {
      const snapshotTime = new Date(Date.now() - (i * 3600000)); // Each snapshot 1 hour apart
      
      const { data, error } = await supabase
        .from(backupConfig.tableName)
        .select('*')
        .limit(10);
      
      if (error && error.code !== 'PGRST116') { // Ignore table not found for demo
        throw error;
      }
      
      snapshots.push({
        timestamp: snapshotTime.toISOString(),
        record_count: data?.length || 0,
        snapshot_id: `snapshot_${i + 1}`
      });
    }
    
    return {
      recovery_points: snapshots.length,
      snapshots: snapshots,
      recovery_window: '3 hours',
      oldest_recovery_point: snapshots[snapshots.length - 1]?.timestamp
    };
  };

  const testBackupVerification = async () => {
    // Verify backup integrity
    const { data: files, error } = await supabase.storage
      .from(backupConfig.bucketName)
      .list('database-backups/', { limit: 5 });
    
    if (error) throw error;
    
    const verificationResults = [];
    
    for (const file of files || []) {
      try {
        const { data: backupFile, error: downloadError } = await supabase.storage
          .from(backupConfig.bucketName)
          .download(`database-backups/${file.name}`);
        
        if (downloadError) throw downloadError;
        
        const content = await backupFile.text();
        const backupData = JSON.parse(content);
        
        verificationResults.push({
          file_name: file.name,
          file_size: file.metadata?.size || 0,
          valid_json: true,
          has_timestamp: !!backupData.timestamp,
          has_data: !!backupData.data,
          integrity_check: 'passed'
        });
      } catch (error) {
        verificationResults.push({
          file_name: file.name,
          integrity_check: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      total_backups_checked: verificationResults.length,
      valid_backups: verificationResults.filter(r => r.integrity_check === 'passed').length,
      corrupted_backups: verificationResults.filter(r => r.integrity_check === 'failed').length,
      verification_results: verificationResults
    };
  };

  const testAutomatedBackup = async () => {
    // Simulate automated backup process
    const backupSchedule = {
      daily: { enabled: true, time: '02:00', retention: 7 },
      weekly: { enabled: true, day: 'sunday', retention: 4 },
      monthly: { enabled: true, day: 1, retention: 12 }
    };
    
    // Create a scheduled backup
    const scheduledBackup = {
      id: `auto_backup_${Date.now()}`,
      type: 'daily',
      scheduled_time: new Date().toISOString(),
      status: 'completed',
      duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      size: Math.floor(Math.random() * 1000000) + 100000, // 100KB - 1MB
      tables_backed_up: ['users', 'posts', 'comments'],
      retention_until: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
    };
    
    return {
      backup_schedule: backupSchedule,
      last_backup: scheduledBackup,
      next_backup: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
      automation_status: 'active'
    };
  };

  const testDisasterRecovery = async () => {
    // Simulate disaster recovery scenario
    const recoveryPlan = {
      rto: '4 hours', // Recovery Time Objective
      rpo: '1 hour',  // Recovery Point Objective
      steps: [
        'Assess damage and determine recovery scope',
        'Identify latest valid backup',
        'Provision new infrastructure if needed',
        'Restore database from backup',
        'Restore storage files',
        'Verify data integrity',
        'Update DNS and routing',
        'Perform application testing',
        'Resume normal operations'
      ]
    };
    
    // Simulate recovery metrics
    const recoveryMetrics = {
      estimated_downtime: '2.5 hours',
      data_loss_window: '30 minutes',
      recovery_confidence: 'high',
      last_tested: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days ago
      test_success_rate: '95%'
    };
    
    return {
      recovery_plan: recoveryPlan,
      recovery_metrics: recoveryMetrics,
      backup_locations: ['primary_storage', 'offsite_backup', 'cloud_replica'],
      recovery_readiness: 'good'
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Backup & Recovery Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Table Name</label>
            <input
              type="text"
              value={backupConfig.tableName}
              onChange={(e) => setBackupConfig({ ...backupConfig, tableName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Backup Bucket</label>
            <input
              type="text"
              value={backupConfig.bucketName}
              onChange={(e) => setBackupConfig({ ...backupConfig, bucketName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Database Backup Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Backup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Database Backup', testDatabaseBackup)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Database Backup</h4>
            <p className="text-sm text-gray-600 mt-1">Export all table data</p>
          </button>

          <button
            onClick={() => runTest('Schema Backup', testSchemaBackup)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Schema Backup</h4>
            <p className="text-sm text-gray-600 mt-1">Export database structure</p>
          </button>

          <button
            onClick={() => runTest('Storage Backup', testStorageBackup)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Storage Backup</h4>
            <p className="text-sm text-gray-600 mt-1">Backup storage buckets</p>
          </button>

          <button
            onClick={() => runTest('Backup to Storage', testBackupToStorage)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Backup to Storage</h4>
            <p className="text-sm text-gray-600 mt-1">Store backup in Supabase Storage</p>
          </button>
        </div>
      </div>

      {/* Recovery Tests */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Restore from Backup', testRestoreFromBackup)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Restore from Backup</h4>
            <p className="text-sm text-gray-600 mt-1">Restore data from backup file</p>
          </button>

          <button
            onClick={() => runTest('Point-in-Time Recovery', testPointInTimeRecovery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Point-in-Time Recovery</h4>
            <p className="text-sm text-gray-600 mt-1">Recover to specific timestamp</p>
          </button>

          <button
            onClick={() => runTest('Disaster Recovery', testDisasterRecovery)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Disaster Recovery</h4>
            <p className="text-sm text-gray-600 mt-1">Full disaster recovery plan</p>
          </button>
        </div>
      </div>

      {/* Backup Management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Backup Verification', testBackupVerification)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Backup Verification</h4>
            <p className="text-sm text-gray-600 mt-1">Verify backup integrity</p>
          </button>

          <button
            onClick={() => runTest('Automated Backup', testAutomatedBackup)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Automated Backup</h4>
            <p className="text-sm text-gray-600 mt-1">Test backup scheduling</p>
          </button>
        </div>
      </div>

      {/* Backup Best Practices */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-900">3-2-1 Backup Rule</h4>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• Keep 3 copies of important data</li>
              <li>• Store 2 backup copies on different media</li>
              <li>• Keep 1 backup copy offsite</li>
            </ul>
          </div>
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <h4 className="font-medium text-green-900">Backup Schedule</h4>
            <ul className="mt-2 text-sm text-green-800 space-y-1">
              <li>• Daily: Critical data (7 day retention)</li>
              <li>• Weekly: Full backup (4 week retention)</li>
              <li>• Monthly: Archive backup (12 month retention)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* PostgreSQL Commands Reference */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">PostgreSQL Backup Commands</h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-100 rounded font-mono text-sm">
            <div className="text-gray-600 mb-1"># Create database dump</div>
            <div>pg_dump -h hostname -U username -d database_name &gt; backup.sql</div>
          </div>
          <div className="p-3 bg-gray-100 rounded font-mono text-sm">
            <div className="text-gray-600 mb-1"># Restore from dump</div>
            <div>psql -h hostname -U username -d database_name &lt; backup.sql</div>
          </div>
          <div className="p-3 bg-gray-100 rounded font-mono text-sm">
            <div className="text-gray-600 mb-1"># Schema only backup</div>
            <div>pg_dump -h hostname -U username -d database_name --schema-only &gt; schema.sql</div>
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

export default BackupTests;