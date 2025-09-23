import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useTest } from '../../contexts/TestContext';
import { useNotification } from '../../contexts/NotificationContext';
import TestResult from '../TestResult';

const StorageTests: React.FC = () => {
  const { addResult, getResultsByCategory } = useTest();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState<string | null>(null);
  const [bucketName, setBucketName] = useState('test-bucket');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const results = getResultsByCategory('storage');

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const testId = `storage-${testName}-${Date.now()}`;
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
        title: 'Storage Test Passed',
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
        title: 'Storage Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(null);
    }
  };

  const testCreateBucket = async () => {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['image/*', 'text/*', 'application/*'],
      fileSizeLimit: 1024 * 1024 * 10 // 10MB
    });
    if (error) throw error;
    return data;
  };

  const testListBuckets = async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return data;
  };

  const testUploadFile = async () => {
    // Create a test file
    const testContent = `Test file content - ${new Date().toISOString()}`;
    const file = new File([testContent], `test-${Date.now()}.txt`, { type: 'text/plain' });
    
    const fileName = `test-files/${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);
    
    if (error) throw error;
    setUploadedFiles(prev => [...prev, fileName]);
    return data;
  };

  const testUploadImage = async () => {
    // Create a simple test image (1x1 pixel PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 1, 1);
    }
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create test image'));
          return;
        }
        
        const fileName = `images/test-${Date.now()}.png`;
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, blob);
        
        if (error) {
          reject(error);
        } else {
          setUploadedFiles(prev => [...prev, fileName]);
          resolve(data);
        }
      }, 'image/png');
    });
  };

  const testListFiles = async () => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        offset: 0
      });
    
    if (error) throw error;
    return data;
  };

  const testDownloadFile = async () => {
    if (uploadedFiles.length === 0) {
      throw new Error('No files uploaded yet. Upload a file first.');
    }
    
    const fileName = uploadedFiles[0];
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);
    
    if (error) throw error;
    
    // Convert blob to text for display
    const text = await data.text();
    return { fileName, content: text, size: data.size };
  };

  const testCreateSignedUrl = async () => {
    if (uploadedFiles.length === 0) {
      throw new Error('No files uploaded yet. Upload a file first.');
    }
    
    const fileName = uploadedFiles[0];
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600); // 1 hour expiry
    
    if (error) throw error;
    return data;
  };

  const testDeleteFile = async () => {
    if (uploadedFiles.length === 0) {
      throw new Error('No files uploaded yet. Upload a file first.');
    }
    
    const fileName = uploadedFiles[uploadedFiles.length - 1];
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);
    
    if (error) throw error;
    setUploadedFiles(prev => prev.filter(f => f !== fileName));
    return data;
  };

  const testGetPublicUrl = async () => {
    if (uploadedFiles.length === 0) {
      throw new Error('No files uploaded yet. Upload a file first.');
    }
    
    const fileName = uploadedFiles[0];
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return data;
  };

  const testBulkUpload = async () => {
    const files = [];
    const uploadPromises = [];
    
    // Create 5 test files
    for (let i = 0; i < 5; i++) {
      const content = `Bulk test file ${i + 1} - ${new Date().toISOString()}`;
      const fileName = `bulk-test/file-${i + 1}-${Date.now()}.txt`;
      const file = new File([content], `file-${i + 1}.txt`, { type: 'text/plain' });
      
      files.push(fileName);
      uploadPromises.push(
        supabase.storage.from(bucketName).upload(fileName, file)
      );
    }
    
    const results = await Promise.all(uploadPromises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      throw new Error(`${errors.length} uploads failed`);
    }
    
    setUploadedFiles(prev => [...prev, ...files]);
    return results.map(r => r.data);
  };

  const handleFileUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addNotification({
        type: 'warning',
        title: 'No File Selected',
        message: 'Please select a file to upload'
      });
      return;
    }

    await runTest(`Upload ${file.name}`, async () => {
      const fileName = `uploads/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);
      
      if (error) throw error;
      setUploadedFiles(prev => [...prev, fileName]);
      return data;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Storage Tests</h1>
      </div>

      {/* Test Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bucket Name</label>
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Uploaded Files</label>
            <p className="mt-1 text-sm text-gray-600">{uploadedFiles.length} files uploaded</p>
          </div>
        </div>
      </div>

      {/* Bucket Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bucket Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Create Bucket', testCreateBucket)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Create Bucket</h4>
            <p className="text-sm text-gray-600 mt-1">Create storage bucket</p>
          </button>

          <button
            onClick={() => runTest('List Buckets', testListBuckets)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">List Buckets</h4>
            <p className="text-sm text-gray-600 mt-1">Get all storage buckets</p>
          </button>
        </div>
      </div>

      {/* File Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => runTest('Upload Text File', testUploadFile)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Upload Text File</h4>
            <p className="text-sm text-gray-600 mt-1">Upload test text file</p>
          </button>

          <button
            onClick={() => runTest('Upload Image', testUploadImage)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Upload Image</h4>
            <p className="text-sm text-gray-600 mt-1">Upload test image file</p>
          </button>

          <button
            onClick={() => runTest('List Files', testListFiles)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">List Files</h4>
            <p className="text-sm text-gray-600 mt-1">Get files in bucket</p>
          </button>

          <button
            onClick={() => runTest('Download File', testDownloadFile)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Download File</h4>
            <p className="text-sm text-gray-600 mt-1">Download uploaded file</p>
          </button>

          <button
            onClick={() => runTest('Create Signed URL', testCreateSignedUrl)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Create Signed URL</h4>
            <p className="text-sm text-gray-600 mt-1">Generate temporary access URL</p>
          </button>

          <button
            onClick={() => runTest('Get Public URL', testGetPublicUrl)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Get Public URL</h4>
            <p className="text-sm text-gray-600 mt-1">Get public file URL</p>
          </button>

          <button
            onClick={() => runTest('Delete File', testDeleteFile)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Delete File</h4>
            <p className="text-sm text-gray-600 mt-1">Remove file from storage</p>
          </button>

          <button
            onClick={() => runTest('Bulk Upload', testBulkUpload)}
            disabled={loading !== null}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <h4 className="font-medium text-gray-900">Bulk Upload</h4>
            <p className="text-sm text-gray-600 mt-1">Upload multiple files</p>
          </button>
        </div>
      </div>

      {/* Custom File Upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom File Upload</h3>
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleFileUpload}
            disabled={loading !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Upload
          </button>
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

export default StorageTests;