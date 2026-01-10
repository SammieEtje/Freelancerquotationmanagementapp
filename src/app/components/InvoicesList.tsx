import React, { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';

interface InvoicesListProps {
  onNavigate: (page: string) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'client-asc' | 'client-desc' | 'due-asc' | 'due-desc';
type ViewMode = 'list' | 'grouped';

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

export const InvoicesList: React.FC<InvoicesListProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  useEffect(() => {
    fetchInvoices();
  }, [accessToken]);

  const fetchInvoices = async () => {
    if (!accessToken) return;

    try {
      const data = await api.getInvoices(accessToken);
      // Check for overdue invoices
      const today = new Date();
      const processedInvoices = (data.invoices || []).map((invoice: any) => {
        if (invoice.status === 'sent' && invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          if (dueDate < today) {
            return { ...invoice, status: 'overdue' };
          }
        }
        return invoice;
      });
      setInvoices(processedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.clientName?.toLowerCase().includes(term) ||
        i.invoiceNumber?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'due-desc':
          return new Date(b.dueDate || b.date).getTime() - new Date(a.dueDate || a.date).getTime();
        case 'due-asc':
          return new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime();
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'client-asc':
          return (a.clientName || '').localeCompare(b.clientName || '');
        case 'client-desc':
          return (b.clientName || '').localeCompare(a.clientName || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [invoices, statusFilter, searchTerm, sortBy]);

  // Group invoices by month/year
  const groupedInvoices = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    filteredInvoices.forEach(invoice => {
      const date = new Date(invoice.date);
      const monthYear = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(invoice);
    });

    return groups;
  }, [filteredInvoices]);

  // Calculate totals for statistics
  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, i) => sum + (i.price || 0), 0);
    const paidTotal = filteredInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.price || 0), 0);
    const openTotal = filteredInvoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + (i.price || 0), 0);
    const byStatus = {
      draft: filteredInvoices.filter(i => i.status === 'draft').length,
      sent: filteredInvoices.filter(i => i.status === 'sent').length,
      paid: filteredInvoices.filter(i => i.status === 'paid').length,
      overdue: filteredInvoices.filter(i => i.status === 'overdue').length,
    };
    return { total, paidTotal, openTotal, byStatus, count: filteredInvoices.length };
  }, [filteredInvoices]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Alle Facturen</h1>
            <div className="flex space-x-4">
              <Button onClick={() => onNavigate('create-invoice')}>
                + Nieuwe Factuur
              </Button>
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Totaal waarde</p>
              <p className="text-2xl font-bold text-blue-600">€{stats.total.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Betaald</p>
              <p className="text-2xl font-bold text-green-600">€{stats.paidTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-bold text-yellow-600">€{stats.openTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Verstuurd</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.byStatus.sent}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Vervallen</p>
              <p className="text-2xl font-bold text-red-600">{stats.byStatus.overdue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Zoek op naam, nummer of omschrijving..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-2"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter op status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Statussen</SelectItem>
                  <SelectItem value="draft">Concept</SelectItem>
                  <SelectItem value="sent">Verstuurd</SelectItem>
                  <SelectItem value="paid">Betaald</SelectItem>
                  <SelectItem value="overdue">Vervallen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Nieuwste eerst</SelectItem>
                  <SelectItem value="date-asc">Oudste eerst</SelectItem>
                  <SelectItem value="due-asc">Vervaldatum oplopend</SelectItem>
                  <SelectItem value="due-desc">Vervaldatum aflopend</SelectItem>
                  <SelectItem value="price-desc">Hoogste bedrag</SelectItem>
                  <SelectItem value="price-asc">Laagste bedrag</SelectItem>
                  <SelectItem value="client-asc">Klant A-Z</SelectItem>
                  <SelectItem value="client-desc">Klant Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-500">{stats.count} factuur/facturen gevonden</p>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grouped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grouped')}
                >
                  Gegroepeerd
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  Lijst
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Laden...</div>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">
                {invoices.length === 0
                  ? 'Nog geen facturen. Maak je eerste factuur aan!'
                  : 'Geen facturen gevonden met deze filters.'}
              </p>
              {invoices.length === 0 && (
                <Button onClick={() => onNavigate('create-invoice')}>
                  Eerste Factuur Aanmaken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grouped' ? (
          /* Grouped View */
          <div className="space-y-6">
            {Object.entries(groupedInvoices).map(([monthYear, monthInvoices]) => (
              <div key={monthYear}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700 capitalize">{monthYear}</h3>
                  <span className="text-sm text-gray-500">
                    {monthInvoices.length} factuur/facturen - €{monthInvoices.reduce((s, i) => s + (i.price || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {monthInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigate(`invoice-detail-${invoice.id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-600' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {invoice.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{invoice.clientName}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${getInvoiceStatusColor(invoice.status)}`}>
                                {getInvoiceStatusLabel(invoice.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {invoice.invoiceNumber} • {formatDate(invoice.date)}
                              {invoice.dueDate && (
                                <span className={invoice.status === 'overdue' ? 'text-red-500' : ''}>
                                  {' '}• Vervalt: {formatDate(invoice.dueDate)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">€{(invoice.price || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">excl. BTW</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Klant</th>
                    <th className="text-left p-4 font-medium text-gray-600 hidden md:table-cell">Nummer</th>
                    <th className="text-left p-4 font-medium text-gray-600 hidden md:table-cell">Datum</th>
                    <th className="text-left p-4 font-medium text-gray-600 hidden lg:table-cell">Vervaldatum</th>
                    <th className="text-left p-4 font-medium text-gray-600">Status</th>
                    <th className="text-right p-4 font-medium text-gray-600">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      onClick={() => onNavigate(`invoice-detail-${invoice.id}`)}
                    >
                      <td className="p-4">
                        <p className="font-medium">{invoice.clientName}</p>
                        <p className="text-sm text-gray-500 md:hidden">{invoice.invoiceNumber}</p>
                      </td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{invoice.invoiceNumber}</td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{formatDate(invoice.date)}</td>
                      <td className={`p-4 hidden lg:table-cell ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded ${getInvoiceStatusColor(invoice.status)}`}>
                          {getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">€{(invoice.price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};
