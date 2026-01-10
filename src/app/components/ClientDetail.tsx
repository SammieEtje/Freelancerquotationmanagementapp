import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';
import { getStatusLabel, getStatusColor } from '../../utils/statusHelpers';

interface ClientDetailProps {
  clientId: string;
  onNavigate: (page: string) => void;
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

export const ClientDetail: React.FC<ClientDetailProps> = ({ clientId, onNavigate }) => {
  const { accessToken } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClientData();
  }, [clientId, accessToken]);

  const fetchClientData = async () => {
    if (!accessToken) return;

    try {
      const data = await api.getClientHistory(accessToken, clientId);
      setClient(data.client);
      setQuotations(data.quotations || []);
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze klant wilt verwijderen? De offertes en facturen blijven bestaan.')) return;
    if (!accessToken) return;

    try {
      await api.deleteClient(accessToken, clientId);
      onNavigate('clients');
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleConvertToInvoice = async (quotationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to quotation detail
    if (!accessToken) return;

    setConvertingId(quotationId);
    try {
      const result = await api.convertQuotationToInvoice(accessToken, quotationId);
      // Refresh data to show the new invoice
      await fetchClientData();
      // Optionally navigate to the new invoice
      onNavigate(`invoice-detail-${result.invoice.id}`);
    } catch (error) {
      console.error('Error converting quotation to invoice:', error);
      alert('Er is een fout opgetreden bij het omzetten naar factuur.');
    } finally {
      setConvertingId(null);
    }
  };

  const formatAddress = () => {
    if (!client) return '';
    const parts = [];
    if (client.address) parts.push(client.address);
    if (client.postalCode || client.city) {
      parts.push([client.postalCode, client.city].filter(Boolean).join(' '));
    }
    if (client.country && client.country !== 'Nederland') {
      parts.push(client.country);
    }
    return parts.join('\n');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate totals
  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.price || 0), 0);
  const totalInvoiceValue = invoices.reduce((sum, i) => sum + (i.price || 0), 0);
  const paidInvoiceValue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.price || 0), 0);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Laden...</div>;
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Klant niet gevonden</p>
          <Button onClick={() => onNavigate('clients')}>Terug naar Klanten</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => onNavigate('clients')}>
              ← Terug naar Klanten
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onNavigate(`edit-client-${clientId}`)}>
                Bewerken
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                {client.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{client.name}</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {formatAddress() && (
                    <div>
                      <p className="text-gray-500 font-medium">Adres</p>
                      <p className="whitespace-pre-line">{formatAddress()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 font-medium">Contact</p>
                    {client.email && <p className="text-blue-600">{client.email}</p>}
                    {client.phone && <p>{client.phone}</p>}
                    {!client.email && !client.phone && <p className="text-gray-400">Geen contactgegevens</p>}
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Zakelijk</p>
                    {client.kvkNumber && <p>KvK: {client.kvkNumber}</p>}
                    {client.vatNumber && <p>BTW: {client.vatNumber}</p>}
                    {!client.kvkNumber && !client.vatNumber && <p className="text-gray-400">Geen zakelijke gegevens</p>}
                  </div>
                </div>
                {client.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-gray-500 font-medium text-sm">Notities</p>
                    <p className="text-sm">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Offertes</p>
              <p className="text-2xl font-bold">{quotations.length}</p>
              <p className="text-sm text-gray-400">€{totalQuotationValue.toFixed(0)} totaal</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Facturen</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
              <p className="text-sm text-gray-400">€{totalInvoiceValue.toFixed(0)} totaal</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Betaald</p>
              <p className="text-2xl font-bold text-green-600">€{paidInvoiceValue.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-bold text-yellow-600">€{(totalInvoiceValue - paidInvoiceValue).toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Button onClick={() => onNavigate(`create-quotation?client=${clientId}`)}>
            + Nieuwe Offerte
          </Button>
          <Button onClick={() => onNavigate(`create-invoice?client=${clientId}`)} className="bg-green-600 hover:bg-green-700">
            + Nieuwe Factuur
          </Button>
        </div>

        {/* History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quotations */}
          <Card>
            <CardHeader>
              <CardTitle>Offertes ({quotations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <p className="text-gray-500 text-sm">Nog geen offertes voor deze klant.</p>
              ) : (
                <div className="space-y-2">
                  {quotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => onNavigate(`quotation-detail-${quotation.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{quotation.quotationNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(quotation.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {(quotation.status === 'sent' || quotation.status === 'accepted') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={(e) => handleConvertToInvoice(quotation.id, e)}
                            disabled={convertingId === quotation.id}
                          >
                            {convertingId === quotation.id ? 'Bezig...' : '→ Factuur'}
                          </Button>
                        )}
                        <div className="text-right">
                          <p className="font-medium">€{(quotation.price || 0).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(quotation.status)}`}>
                            {getStatusLabel(quotation.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Facturen ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-gray-500 text-sm">Nog geen facturen voor deze klant.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => onNavigate(`invoice-detail-${invoice.id}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€{(invoice.price || 0).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${getInvoiceStatusColor(invoice.status)}`}>
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

        {/* Delete button */}
        <div className="mt-8">
          <Button variant="destructive" onClick={handleDelete}>
            Klant Verwijderen
          </Button>
        </div>
      </main>
    </div>
  );
};
