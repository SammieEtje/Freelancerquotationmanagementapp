import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';

interface ClientFormProps {
  clientId?: string;
  onNavigate: (page: string) => void;
  onSaved?: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ clientId, onNavigate, onSaved }) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Nederland',
    kvkNumber: '',
    vatNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    if (!accessToken || !clientId) return;

    try {
      const data = await api.getClient(accessToken, clientId);
      const client = data.client;
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        postalCode: client.postalCode || '',
        city: client.city || '',
        country: client.country || 'Nederland',
        kvkNumber: client.kvkNumber || '',
        vatNumber: client.vatNumber || '',
        notes: client.notes || '',
      });
    } catch (error) {
      console.error('Error fetching client:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!accessToken) {
        throw new Error('Je bent niet ingelogd. Log opnieuw in.');
      }

      if (!formData.name.trim()) {
        throw new Error('Vul een klantnaam in.');
      }

      if (clientId) {
        await api.updateClient(accessToken, clientId, formData);
      } else {
        await api.createClient(accessToken, formData);
      }

      setSuccess('Klant succesvol opgeslagen!');

      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else {
          onNavigate('clients');
        }
      }, 1000);

    } catch (err: any) {
      console.error('Client save error:', err);
      setError(err.message || 'Er is een onbekende fout opgetreden bij het opslaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => onNavigate('clients')}>
            ← Terug naar Klanten
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{clientId ? 'Klant Bewerken' : 'Nieuwe Klant'}</CardTitle>
            <CardDescription>
              Vul de gegevens van je klant in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basisgegevens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Basisgegevens</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Bedrijfs-/Klantnaam *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Naam van de klant of bedrijf"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="klant@voorbeeld.nl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="06-12345678"
                    />
                  </div>
                </div>
              </div>

              {/* Adresgegevens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Adresgegevens</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Straat en huisnummer</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Voorbeeldstraat 123"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postcode</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="1234 AB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Plaats</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Amsterdam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Land</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Nederland"
                    />
                  </div>
                </div>
              </div>

              {/* Zakelijke gegevens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Zakelijke gegevens (optioneel)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kvkNumber">KvK-nummer</Label>
                    <Input
                      id="kvkNumber"
                      value={formData.kvkNumber}
                      onChange={(e) => setFormData({ ...formData, kvkNumber: e.target.value })}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">BTW-nummer</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      placeholder="NL123456789B01"
                    />
                  </div>
                </div>
              </div>

              {/* Notities */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notities (optioneel)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Extra informatie over deze klant..."
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm p-3 bg-green-50 rounded">
                  {success}
                </div>
              )}

              <div className="flex space-x-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Bezig...' : clientId ? 'Bijwerken' : 'Aanmaken'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onNavigate('clients')}>
                  Annuleren
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
