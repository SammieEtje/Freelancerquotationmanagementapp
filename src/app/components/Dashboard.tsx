import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { projectId } from '../../../utils/supabase/info';
import { DebugPanel } from './DebugPanel';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface QuotationStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, signOut, accessToken } = useAuth();
  const [stats, setStats] = useState<QuotationStats>({ total: 0, draft: 0, sent: 0, accepted: 0 });
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken]);

  const fetchDashboardData = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/quotations`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const quotations = data.quotations || [];

        // Calculate stats
        const newStats = {
          total: quotations.length,
          draft: quotations.filter((q: any) => q.status === 'draft').length,
          sent: quotations.filter((q: any) => q.status === 'sent').length,
          accepted: quotations.filter((q: any) => q.status === 'accepted').length,
        };

        setStats(newStats);
        setRecentQuotations(quotations.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => onNavigate('settings')}>
                Instellingen
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl mb-4">Welkom, {user?.email}</h2>
          
          {/* Debug Panel - tijdelijk voor troubleshooting */}
          <DebugPanel />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Totaal Offertes</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Concept</CardDescription>
                <CardTitle className="text-3xl">{stats.draft}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Verstuurd</CardDescription>
                <CardTitle className="text-3xl">{stats.sent}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Geaccepteerd</CardDescription>
                <CardTitle className="text-3xl">{stats.accepted}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex space-x-4">
            <Button size="lg" onClick={() => onNavigate('create-quotation')}>
              + Nieuwe Offerte
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('quotations')}>
              Bekijk Alle Offertes
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recente Offertes</CardTitle>
            <CardDescription>Je laatste 5 offertes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Laden...</p>
            ) : recentQuotations.length === 0 ? (
              <p className="text-gray-500">Nog geen offertes. Maak je eerste offerte aan!</p>
            ) : (
              <div className="space-y-3">
                {recentQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => onNavigate(`quotation-detail-${quotation.id}`)}
                  >
                    <div>
                      <p className="font-medium">{quotation.clientName}</p>
                      <p className="text-sm text-gray-600">{quotation.quotationNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{quotation.price.toFixed(2)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          quotation.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : quotation.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {quotation.status === 'draft' ? 'Concept' : quotation.status === 'sent' ? 'Verstuurd' : 'Geaccepteerd'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};