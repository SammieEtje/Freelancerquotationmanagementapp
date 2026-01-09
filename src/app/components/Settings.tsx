import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

const MAX_LOGO_SIZE = 500 * 1024; // 500KB

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    address: '',
    email: '',
    phone: '',
    kvkNumber: '',
    vatNumber: '',
    logo: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [accessToken]);

  const fetchProfile = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const data = await api.getProfile(accessToken);
      const profile = data.profile;
      setFormData({
        companyName: profile.companyName || '',
        name: profile.name || '',
        address: profile.address || '',
        email: profile.email || '',
        phone: profile.phone || '',
        kvkNumber: profile.kvkNumber || '',
        vatNumber: profile.vatNumber || '',
        logo: profile.logo || '',
      });
      if (profile.logo) {
        setLogoPreview(profile.logo);
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

      await api.updateProfile(accessToken, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      setError('Logo is te groot. Maximaal 500KB toegestaan.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingsbestanden zijn toegestaan.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setFormData({ ...formData, logo: base64 });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
                  <Label htmlFor="logo">Bedrijfslogo</Label>
                  <p className="text-sm text-gray-500">Dit logo wordt weergegeven op je offertes (max. 500KB)</p>
                  <div className="flex items-start gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-24 w-auto max-w-48 object-contain border rounded p-2 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-48 border-2 border-dashed rounded flex items-center justify-center text-gray-400 bg-gray-50">
                        Geen logo
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {logoPreview ? 'Ander logo kiezen' : 'Logo uploaden'}
                      </Button>
                    </div>
                  </div>
                </div>

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