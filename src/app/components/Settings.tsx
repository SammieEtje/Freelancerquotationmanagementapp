import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { projectId } from '../../../utils/supabase/info';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    address: '',
    email: '',
    phone: '',
    kvkNumber: '',
    vatNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [accessToken]);

  const fetchProfile = async () => {
    if (!accessToken) {
      console.log('No access token, skipping profile fetch');
      return;
    }

    console.log('Fetching profile...');
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      console.log('Profile fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data:', data);
        const profile = data.profile;
        setFormData({
          companyName: profile.companyName || '',
          name: profile.name || '',
          address: profile.address || '',
          email: profile.email || '',
          phone: profile.phone || '',
          kvkNumber: profile.kvkNumber || '',
          vatNumber: profile.vatNumber || '',
        });
        console.log('Profile loaded successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch profile:', errorData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      if (!accessToken) {
        throw new Error('Je bent niet ingelogd. Log opnieuw in.');
      }

      console.log('Saving profile with data:', formData);
      console.log('Access token present:', !!accessToken);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
        }
      );

      console.log('Profile update response status:', response.status);

      let data;
      try {
        data = await response.json();
        console.log('Profile update response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Ongeldig antwoord van server');
      }

      if (!response.ok) {
        const errorMessage = data.error || `Server error (${response.status})`;
        console.error('Server returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Profile saved successfully!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het opslaan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Instellingen</h1>
            <Button variant="outline" onClick={() => onNavigate('dashboard')}>
              Terug naar Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bedrijfsgegevens</CardTitle>
            <CardDescription>
              Deze gegevens worden gebruikt op je offertes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Laden...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Bedrijfsnaam *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Naam *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    placeholder="Straat en huisnummer&#10;Postcode en plaats"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kvkNumber">KvK-nummer</Label>
                    <Input
                      id="kvkNumber"
                      value={formData.kvkNumber}
                      onChange={(e) => setFormData({ ...formData, kvkNumber: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">BTW-nummer (optioneel)</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-600 text-sm p-3 bg-green-50 rounded">
                    Gegevens succesvol bijgewerkt!
                  </div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? 'Bezig met opslaan...' : 'Opslaan'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};