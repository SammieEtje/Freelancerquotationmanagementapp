import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import { projectId } from '../../../utils/supabase/info';

interface QuotationFormProps {
  quotationId?: string;
  onNavigate: (page: string) => void;
  onSaved?: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ quotationId, onNavigate, onSaved }) => {
  const { accessToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    description: '',
    price: '',
    vatPercentage: '21',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
  });

  // Debug: Log access token status
  useEffect(() => {
    console.log('QuotationForm - Auth loading:', authLoading);
    console.log('QuotationForm - Access token present:', !!accessToken);
    if (accessToken) {
      console.log('QuotationForm - Access token length:', accessToken.length);
    }
  }, [accessToken, authLoading]);

  useEffect(() => {
    if (quotationId) {
      fetchQuotation();
    }
  }, [quotationId]);

  const fetchQuotation = async () => {
    if (!accessToken || !quotationId) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/quotations/${quotationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const quotation = data.quotation;
        setFormData({
          clientName: quotation.clientName,
          clientAddress: quotation.clientAddress,
          description: quotation.description,
          price: quotation.price.toString(),
          vatPercentage: quotation.vatPercentage.toString(),
          status: quotation.status,
          date: quotation.date.split('T')[0],
        });
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
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

      const url = quotationId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/quotations/${quotationId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/quotations`;

      const method = quotationId ? 'PUT' : 'POST';

      console.log('Sending quotation request to:', url);
      console.log('Method:', method);
      console.log('Form data:', formData);
      console.log('Access token present:', !!accessToken);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          vatPercentage: parseInt(formData.vatPercentage),
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Ongeldig antwoord van server');
      }

      if (!response.ok) {
        const errorMessage = data.error || `Server error (${response.status})`;
        console.error('Server returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      // Success!
      console.log('Quotation saved successfully!');
      setSuccess('Offerte succesvol opgeslagen!');
      
      // Wait a moment to show success message, then navigate
      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else {
          onNavigate('quotations');
        }
      }, 1000);
      
    } catch (err: any) {
      console.error('Quotation save error:', err);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      setError(err.message || 'Er is een onbekende fout opgetreden bij het opslaan');
    } finally {
      setLoading(false);
    }
  };

  const calculateVat = () => {
    const price = parseFloat(formData.price) || 0;
    const vatPercentage = parseInt(formData.vatPercentage) || 0;
    return (price * vatPercentage) / 100;
  };

  const calculateTotal = () => {
    const price = parseFloat(formData.price) || 0;
    return price + calculateVat();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
            ← Terug naar Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{quotationId ? 'Offerte Bewerken' : 'Nieuwe Offerte'}</CardTitle>
            <CardDescription>
              Vul de gegevens in voor je offerte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Klant Naam *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Datum *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientAddress">Klant Adres *</Label>
                <Textarea
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving Werkzaamheden *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prijs (excl. BTW) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatPercentage">BTW Percentage *</Label>
                  <Select
                    value={formData.vatPercentage}
                    onValueChange={(value) => setFormData({ ...formData, vatPercentage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Concept</SelectItem>
                    <SelectItem value="sent">Verstuurd</SelectItem>
                    <SelectItem value="accepted">Geaccepteerd</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.price && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Prijs excl. BTW:</span>
                    <span>€{parseFloat(formData.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTW ({formData.vatPercentage}%):</span>
                    <span>€{calculateVat().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Totaal incl. BTW:</span>
                    <span>€{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}

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
                  {loading ? 'Bezig...' : quotationId ? 'Bijwerken' : 'Aanmaken'}
                </Button>
                <Button type="button" variant="outline" onClick={() => onNavigate('dashboard')}>
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