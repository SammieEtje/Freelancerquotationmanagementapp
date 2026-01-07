import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export const DebugPanel: React.FC = () => {
  const { accessToken, user } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testHealthEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/health`
      );
      const data = await response.json();
      setTestResult({ endpoint: 'health', success: true, data });
    } catch (error: any) {
      setTestResult({ endpoint: 'health', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testProfileEndpoint = async () => {
    setLoading(true);
    try {
      console.log('Testing profile endpoint...');
      console.log('Access token:', accessToken?.substring(0, 20) + '...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      console.log('Profile response status:', response.status);
      
      const data = await response.json();
      console.log('Profile response data:', data);
      
      setTestResult({ 
        endpoint: 'profile', 
        success: response.ok, 
        status: response.status,
        data 
      });
    } catch (error: any) {
      console.error('Profile test error:', error);
      setTestResult({ endpoint: 'profile', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testQuotationEndpoint = async () => {
    setLoading(true);
    try {
      console.log('Testing quotation endpoint...');
      console.log('Access token:', accessToken?.substring(0, 20) + '...');
      
      const testQuotation = {
        clientName: 'Test Client',
        clientAddress: 'Test Address 123',
        description: 'Test quotation',
        price: 100,
        vatPercentage: 21,
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
      };
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/quotations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(testQuotation),
        }
      );
      
      console.log('Quotation response status:', response.status);
      
      const data = await response.json();
      console.log('Quotation response data:', data);
      
      setTestResult({ 
        endpoint: 'quotations (POST)', 
        success: response.ok, 
        status: response.status,
        data 
      });
    } catch (error: any) {
      console.error('Quotation test error:', error);
      setTestResult({ endpoint: 'quotations', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4 border-orange-500">
      <CardHeader>
        <CardTitle>🔧 Debug Panel</CardTitle>
        <CardDescription>Test de backend endpoints en check je authenticatie</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>User ID:</strong> {user?.id || 'Niet ingelogd'}
          </div>
          <div className="text-sm">
            <strong>Email:</strong> {user?.email || 'Niet ingelogd'}
          </div>
          <div className="text-sm">
            <strong>Access Token:</strong> {accessToken ? `${accessToken.substring(0, 30)}...` : 'Geen token'}
          </div>
          <div className="text-sm">
            <strong>Project ID:</strong> {projectId}
          </div>
          <div className="text-sm break-all">
            <strong>Anon Key:</strong> {publicAnonKey.substring(0, 40)}...
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={testHealthEndpoint} disabled={loading} size="sm">
            Test Health
          </Button>
          <Button onClick={testProfileEndpoint} disabled={loading || !accessToken} size="sm">
            Test Profile
          </Button>
          <Button onClick={testQuotationEndpoint} disabled={loading || !accessToken} size="sm">
            Test Quotation
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg text-sm ${
            testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="font-bold mb-2">
              {testResult.endpoint} - {testResult.success ? '✅ Gelukt' : '❌ Mislukt'}
            </div>
            {testResult.status && (
              <div className="mb-2">Status: {testResult.status}</div>
            )}
            <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
              {JSON.stringify(testResult.data || testResult.error, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded">
          <div className="font-bold mb-1">Tips:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Als "Test Health" werkt, is de backend bereikbaar</li>
            <li>Als "Test Profile" 401 geeft, is er een auth probleem</li>
            <li>Check de browser console (F12) voor meer details</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
