import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import { projectId } from '../../../utils/supabase/info';

interface QuotationsListProps {
  onNavigate: (page: string) => void;
}

export const QuotationsList: React.FC<QuotationsListProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchQuotations();
  }, [accessToken]);

  useEffect(() => {
    filterQuotations();
  }, [quotations, searchTerm, statusFilter]);

  const fetchQuotations = async () => {
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
        const sortedQuotations = (data.quotations || []).sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setQuotations(sortedQuotations);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotations = () => {
    let filtered = quotations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredQuotations(filtered);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Concept';
      case 'sent': return 'Verstuurd';
      case 'accepted': return 'Geaccepteerd';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter & Zoeken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Zoek op naam of offertenummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
        ) : (
          <div className="grid gap-4">
            {filteredQuotations.map((quotation) => (
              <Card
                key={quotation.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigate(`quotation-detail-${quotation.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{quotation.clientName}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(quotation.status)}`}>
                          {getStatusLabel(quotation.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{quotation.quotationNumber}</p>
                      <p className="text-sm text-gray-500">{new Date(quotation.date).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">€{quotation.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">excl. BTW</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};