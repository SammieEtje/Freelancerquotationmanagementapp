import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';
import { getStatusLabel, getStatusColor } from '../../utils/statusHelpers';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface QuotationStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
}

interface InvoiceStats {
  total: number;
  totalValue: number;
  paidValue: number;
  openValue: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
}

const getInvoiceStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    draft: 'Concept',
    sent: 'Verstuurd',
    paid: 'Betaald',
    overdue: 'Vervallen',
  };
  return labels[status] || status;
};

const getInvoiceStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, signOut, accessToken } = useAuth();
  const [stats, setStats] = useState<QuotationStats>({ total: 0, draft: 0, sent: 0, accepted: 0 });
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({
    total: 0, totalValue: 0, paidValue: 0, openValue: 0, draft: 0, sent: 0, paid: 0, overdue: 0
  });
  const [clientCount, setClientCount] = useState(0);
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken]);

  const fetchDashboardData = async () => {
    if (!accessToken) return;

    try {
      const [quotationsData, invoicesData, clientsData] = await Promise.all([
        api.getQuotations(accessToken),
        api.getInvoices(accessToken),
        api.getClients(accessToken),
      ]);

      setClientCount((clientsData.clients || []).length);

      const quotations = quotationsData.quotations || [];
      const invoices = invoicesData.invoices || [];

      // Process invoices for overdue status
      const today = new Date();
      const processedInvoices = invoices.map((invoice: any) => {
        if (invoice.status === 'sent' && invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          if (dueDate < today) {
            return { ...invoice, status: 'overdue' };
          }
        }
        return invoice;
      });

      const newStats = {
        total: quotations.length,
        draft: quotations.filter((q: any) => q.status === 'draft').length,
        sent: quotations.filter((q: any) => q.status === 'sent').length,
        accepted: quotations.filter((q: any) => q.status === 'accepted').length,
      };

      const newInvoiceStats = {
        total: processedInvoices.length,
        totalValue: processedInvoices.reduce((sum: number, i: any) => sum + (i.price || 0), 0),
        paidValue: processedInvoices
          .filter((i: any) => i.status === 'paid')
          .reduce((sum: number, i: any) => sum + (i.price || 0), 0),
        openValue: processedInvoices
          .filter((i: any) => i.status === 'sent' || i.status === 'overdue')
          .reduce((sum: number, i: any) => sum + (i.price || 0), 0),
        draft: processedInvoices.filter((i: any) => i.status === 'draft').length,
        sent: processedInvoices.filter((i: any) => i.status === 'sent').length,
        paid: processedInvoices.filter((i: any) => i.status === 'paid').length,
        overdue: processedInvoices.filter((i: any) => i.status === 'overdue').length,
      };

      setStats(newStats);
      setInvoiceStats(newInvoiceStats);
      setRecentQuotations(quotations.slice(0, 5));
      setRecentInvoices(processedInvoices.slice(0, 5));
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
              <Button variant="ghost" onClick={() => onNavigate('clients')}>
                Klanten ({clientCount})
              </Button>
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

          <div className="flex flex-wrap gap-4">
            <Button size="lg" onClick={() => onNavigate('create-quotation')}>
              + Nieuwe Offerte
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('quotations')}>
              Bekijk Alle Offertes
            </Button>
          </div>
        </div>

        {/* Facturen sectie */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Facturen Overzicht</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Totaal Facturen</CardDescription>
                <CardTitle className="text-3xl">{invoiceStats.total}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Betaald</CardDescription>
                <CardTitle className="text-3xl text-green-600">€{invoiceStats.paidValue.toFixed(0)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">€{invoiceStats.openValue.toFixed(0)}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Vervallen</CardDescription>
                <CardTitle className={`text-3xl ${invoiceStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {invoiceStats.overdue}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" onClick={() => onNavigate('create-invoice')} className="bg-green-600 hover:bg-green-700">
              + Nieuwe Factuur
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('invoices')}>
              Bekijk Alle Facturen
            </Button>
          </div>
        </div>

        {/* Recent items grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(quotation.status)}`}>
                          {getStatusLabel(quotation.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recente Facturen</CardTitle>
              <CardDescription>Je laatste 5 facturen</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Laden...</p>
              ) : recentInvoices.length === 0 ? (
                <p className="text-gray-500">Nog geen facturen. Maak je eerste factuur aan!</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => onNavigate(`invoice-detail-${invoice.id}`)}
                    >
                      <div>
                        <p className="font-medium">{invoice.clientName}</p>
                        <p className="text-sm text-gray-600">{invoice.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€{invoice.price.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getInvoiceStatusColor(invoice.status)}`}>
                          {getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};