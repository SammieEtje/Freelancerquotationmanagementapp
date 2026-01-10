import React, { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';

interface ClientsListProps {
  onNavigate: (page: string) => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, [accessToken]);

  const fetchClients = async () => {
    if (!accessToken) return;

    try {
      const data = await api.getClients(accessToken);
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;

    const term = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.city?.toLowerCase().includes(term) ||
      client.phone?.includes(term)
    );
  }, [clients, searchTerm]);

  // Sort alphabetically by name
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [filteredClients]);

  // Group clients by first letter
  const groupedClients = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    sortedClients.forEach(client => {
      const firstLetter = (client.name || '?')[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(client);
    });

    return groups;
  }, [sortedClients]);

  const formatAddress = (client: any) => {
    const parts = [];
    if (client.address) parts.push(client.address);
    if (client.postalCode || client.city) {
      parts.push([client.postalCode, client.city].filter(Boolean).join(' '));
    }
    return parts.join(', ') || 'Geen adres';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Klanten</h1>
            <div className="flex space-x-4">
              <Button onClick={() => onNavigate('create-client')}>
                + Nieuwe Klant
              </Button>
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Totaal Klanten</p>
              <p className="text-2xl font-bold text-blue-600">{clients.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Met E-mail</p>
              <p className="text-2xl font-bold text-green-600">
                {clients.filter(c => c.email).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Met Adres</p>
              <p className="text-2xl font-bold text-purple-600">
                {clients.filter(c => c.address || c.city).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Input
              placeholder="Zoek op naam, e-mail, plaats of telefoon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-2">
              {filteredClients.length} klant(en) gevonden
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Laden...</div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">
                {clients.length === 0
                  ? 'Nog geen klanten. Voeg je eerste klant toe!'
                  : 'Geen klanten gevonden met deze zoekopdracht.'}
              </p>
              {clients.length === 0 && (
                <Button onClick={() => onNavigate('create-client')}>
                  Eerste Klant Toevoegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedClients).map(([letter, letterClients]) => (
              <div key={letter}>
                <div className="flex items-center mb-3">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {letter}
                  </span>
                  <div className="h-px bg-gray-200 flex-1 ml-3" />
                </div>
                <div className="space-y-2">
                  {letterClients.map((client) => (
                    <div
                      key={client.id}
                      className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigate(`client-detail-${client.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                            {client.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-lg">{client.name}</p>
                            <p className="text-sm text-gray-500">{formatAddress(client)}</p>
                            <div className="flex gap-4 mt-1 text-sm">
                              {client.email && (
                                <span className="text-blue-600">{client.email}</span>
                              )}
                              {client.phone && (
                                <span className="text-gray-600">{client.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {client.kvkNumber && (
                            <p>KvK: {client.kvkNumber}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
