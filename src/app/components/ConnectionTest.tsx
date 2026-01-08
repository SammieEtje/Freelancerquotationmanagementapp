import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { projectId } from '../../../utils/supabase/info';

export const ConnectionTest: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test: string, success: boolean, details: any) => {
    setResults(prev => [...prev, { test, success, details, timestamp: new Date().toISOString() }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testAllEndpoints = async () => {
    setTesting(true);
    clearResults();

    // Test 1: Health endpoint zonder auth
    try {
      console.log('🧪 Test 1: Health endpoint');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/health`;
      console.log('Testing URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      addResult('Health Check (no auth)', response.ok, {
        status: response.status,
        url,
        data
      });
    } catch (error: any) {
      addResult('Health Check (no auth)', false, {
        error: error.message,
        type: error.name
      });
    }

    // Test 2: Alternative health URL
    try {
      console.log('🧪 Test 2: Alternative health endpoint');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/health`;
      console.log('Testing URL with fetch options:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      addResult('Health Check (with headers)', response.ok, {
        status: response.status,
        url,
        data
      });
    } catch (error: any) {
      addResult('Health Check (with headers)', false, {
        error: error.message,
        type: error.name
      });
    }

    // Test 3: Check if function exists
    try {
      console.log('🧪 Test 3: Function exists check');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab`;
      console.log('Testing base URL:', url);
      
      const response = await fetch(url);
      
      addResult('Base URL Check', true, {
        status: response.status,
        statusText: response.statusText,
        url,
        note: 'Any response means the function exists'
      });
    } catch (error: any) {
      addResult('Base URL Check', false, {
        error: error.message,
        type: error.name,
        note: 'Failed to fetch means function might not be deployed'
      });
    }

    // Test 4: CORS preflight
    try {
      console.log('🧪 Test 4: CORS preflight');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/health`;
      
      const response = await fetch(url, {
        method: 'OPTIONS'
      });
      
      addResult('CORS Preflight', response.ok, {
        status: response.status,
        headers: {
          'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        }
      });
    } catch (error: any) {
      addResult('CORS Preflight', false, {
        error: error.message,
        type: error.name
      });
    }

    setTesting(false);
  };

  return (
    <Card className="mb-4 border-blue-500">
      <CardHeader>
        <CardTitle>🔌 Backend Verbinding Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Project ID:</strong> {projectId}
          </div>
          <div className="text-sm">
            <strong>Expected Base URL:</strong> 
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              https://{projectId}.supabase.co/functions/v1/make-server-82bafaab
            </code>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={testAllEndpoints} disabled={testing}>
            {testing ? 'Testing...' : 'Run All Tests'}
          </Button>
          <Button onClick={clearResults} variant="outline" disabled={results.length === 0}>
            Clear Results
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="font-bold mb-2">
                  {result.success ? '✅' : '❌'} {result.test}
                </div>
                <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
          <div className="font-bold mb-2">⚠️ Wat betekenen de resultaten?</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Als ALLE tests falen met "Failed to fetch":</strong> De Edge Function is niet gedeployed of de naam klopt niet</li>
            <li><strong>Als test 1 of 2 slaagt:</strong> De backend is bereikbaar! Dan ligt het aan authenticatie</li>
            <li><strong>Als alleen "Base URL Check" slaagt:</strong> De function bestaat, maar de routes werken niet</li>
            <li><strong>Als "CORS Preflight" faalt:</strong> CORS is niet goed geconfigureerd in de backend</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};