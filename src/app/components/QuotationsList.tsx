import React, { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';
import { getStatusLabel, getStatusColor } from '../../utils/statusHelpers';

interface QuotationsListProps {
  onNavigate: (page: string) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'client-asc' | 'client-desc';
type ViewMode = 'list' | 'grouped';

export const QuotationsList: React.FC<QuotationsListProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  useEffect(() => {
    fetchQuotations();
  }, [accessToken]);

  const fetchQuotations = async () => {
    if (!accessToken) return;

    try {
      const data = await api.getQuotations(accessToken);
      setQuotations(data.quotations || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort quotations
  const filteredQuotations = useMemo(() => {
    let filtered = [...quotations];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.clientName?.toLowerCase().includes(term) ||
        q.quotationNumber?.toLowerCase().includes(term) ||
        q.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
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
  }, [quotations, statusFilter, searchTerm, sortBy]);

  // Group quotations by month/year
  const groupedQuotations = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    filteredQuotations.forEach(q => {
      const date = new Date(q.date);
      const monthYear = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(q);
    });

    return groups;
  }, [filteredQuotations]);

  // Calculate totals for statistics
  const stats = useMemo(() => {
    const total = filteredQuotations.reduce((sum, q) => sum + (q.price || 0), 0);
    const byStatus = {
      draft: filteredQuotations.filter(q => q.status === 'draft').length,
      sent: filteredQuotations.filter(q => q.status === 'sent').length,
      accepted: filteredQuotations.filter(q => q.status === 'accepted').length,
    };
    return { total, byStatus, count: filteredQuotations.length };
  }, [filteredQuotations]);

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
            <h1 className="text-2xl font-bold text-gray-900">Alle Offertes</h1>
            <div className="flex space-x-4">
              <Button onClick={() => onNavigate('create-quotation')}>
                + Nieuwe Offerte
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Totaal waarde</p>
              <p className="text-2xl font-bold text-blue-600">€{stats.total.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Concept</p>
              <p className="text-2xl font-bold text-gray-600">{stats.byStatus.draft}</p>
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
              <p className="text-sm text-gray-500">Geaccepteerd</p>
              <p className="text-2xl font-bold text-green-600">{stats.byStatus.accepted}</p>
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
                  <SelectItem value="accepted">Geaccepteerd</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Nieuwste eerst</SelectItem>
                  <SelectItem value="date-asc">Oudste eerst</SelectItem>
                  <SelectItem value="price-desc">Hoogste prijs</SelectItem>
                  <SelectItem value="price-asc">Laagste prijs</SelectItem>
                  <SelectItem value="client-asc">Klant A-Z</SelectItem>
                  <SelectItem value="client-desc">Klant Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-500">{stats.count} offerte(s) gevonden</p>
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
        ) : filteredQuotations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">
                {quotations.length === 0
                  ? 'Nog geen offertes. Maak je eerste offerte aan!'
                  : 'Geen offertes gevonden met deze filters.'}
              </p>
              {quotations.length === 0 && (
                <Button onClick={() => onNavigate('create-quotation')}>
                  Eerste Offerte Aanmaken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grouped' ? (
          /* Grouped View */
          <div className="space-y-6">
            {Object.entries(groupedQuotations).map(([monthYear, monthQuotations]) => (
              <div key={monthYear}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700 capitalize">{monthYear}</h3>
                  <span className="text-sm text-gray-500">
                    {monthQuotations.length} offerte(s) - €{monthQuotations.reduce((s, q) => s + (q.price || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {monthQuotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigate(`quotation-detail-${quotation.id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {quotation.clientName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{quotation.clientName}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(quotation.status)}`}>
                                {getStatusLabel(quotation.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {quotation.quotationNumber} • {formatDate(quotation.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">€{(quotation.price || 0).toFixed(2)}</p>
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
                    <th className="text-left p-4 font-medium text-gray-600">Status</th>
                    <th className="text-right p-4 font-medium text-gray-600">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((quotation, index) => (
                    <tr
                      key={quotation.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      onClick={() => onNavigate(`quotation-detail-${quotation.id}`)}
                    >
                      <td className="p-4">
                        <p className="font-medium">{quotation.clientName}</p>
                        <p className="text-sm text-gray-500 md:hidden">{quotation.quotationNumber}</p>
                      </td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{quotation.quotationNumber}</td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{formatDate(quotation.date)}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(quotation.status)}`}>
                          {getStatusLabel(quotation.status)}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">€{(quotation.price || 0).toFixed(2)}</td>
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