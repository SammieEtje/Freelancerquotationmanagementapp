import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';

interface InvoiceFormProps {
  invoiceId?: string;
  onNavigate: (page: string) => void;
  onSaved?: () => void;
}

interface LineItem {
  id: string;
  description: string;
  unitPrice: string;
  quantity: string;
  vatPercentage: string;
}

const createEmptyLineItem = (): LineItem => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  description: '',
  unitPrice: '',
  quantity: '1',
  vatPercentage: '21',
});

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoiceId, onNavigate, onSaved }) => {
  const { accessToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTermDays: '30',
    notes: '',
  });

  // Fetch clients for selector
  useEffect(() => {
    const fetchClients = async () => {
      if (!accessToken) return;
      try {
        const data = await api.getClients(accessToken);
        setClients(data.clients || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, [accessToken]);

  // Set default due date to 30 days from now
  useEffect(() => {
    if (!formData.dueDate && !invoiceId) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setFormData(prev => ({ ...prev, dueDate: defaultDue.toISOString().split('T')[0] }));
    }
  }, []);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'new') {
      setFormData(prev => ({ ...prev, clientName: '', clientAddress: '' }));
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const addressParts = [];
      if (client.address) addressParts.push(client.address);
      if (client.postalCode || client.city) {
        addressParts.push([client.postalCode, client.city].filter(Boolean).join(' '));
      }
      if (client.country && client.country !== 'Nederland') {
        addressParts.push(client.country);
      }
      setFormData(prev => ({
        ...prev,
        clientName: client.name,
        clientAddress: addressParts.join('\n'),
      }));
    }
  };

  const fetchInvoice = async () => {
    if (!accessToken || !invoiceId) return;

    try {
      const data = await api.getInvoice(accessToken, invoiceId);
      const invoice = data.invoice;
      setFormData({
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress,
        status: invoice.status,
        date: invoice.date.split('T')[0],
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
        paymentTermDays: String(invoice.paymentTermDays || 30),
        notes: invoice.notes || '',
      });

      // Load line items if they exist, otherwise convert old format
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        setLineItems(invoice.lineItems.map((item: any) => ({
          ...item,
          unitPrice: String(item.unitPrice),
          quantity: String(item.quantity),
          vatPercentage: String(item.vatPercentage),
        })));
      } else {
        // Convert old single-price format to line items
        setLineItems([{
          id: '1',
          description: invoice.description || '',
          unitPrice: invoice.price?.toString() || '',
          quantity: '1',
          vatPercentage: invoice.vatPercentage?.toString() || '21',
        }]);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  // Line item handlers
  const addLineItem = () => {
    setLineItems([...lineItems, createEmptyLineItem()]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Calculate totals
  const getLineItemTotal = (item: LineItem) => {
    const price = parseFloat(item.unitPrice) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    return price * quantity;
  };

  const getLineItemVat = (item: LineItem) => {
    const total = getLineItemTotal(item);
    const vatPercentage = parseFloat(item.vatPercentage) || 0;
    return (total * vatPercentage) / 100;
  };

  const getSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + getLineItemTotal(item), 0);
  };

  const getVatTotals = () => {
    const vatMap: { [key: string]: number } = {};
    lineItems.forEach(item => {
      const vat = item.vatPercentage;
      if (!vatMap[vat]) vatMap[vat] = 0;
      vatMap[vat] += getLineItemVat(item);
    });
    return vatMap;
  };

  const getTotalVat = () => {
    return lineItems.reduce((sum, item) => sum + getLineItemVat(item), 0);
  };

  const getGrandTotal = () => {
    return getSubtotal() + getTotalVat();
  };

  // Update due date when payment term changes
  const handlePaymentTermChange = (days: string) => {
    setFormData(prev => {
      const newDue = new Date(prev.date || new Date());
      newDue.setDate(newDue.getDate() + parseInt(days));
      return { ...prev, paymentTermDays: days, dueDate: newDue.toISOString().split('T')[0] };
    });
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

      // Validate line items
      const validLineItems = lineItems.filter(item =>
        item.description.trim() && parseFloat(item.unitPrice) > 0
      );

      if (validLineItems.length === 0) {
        throw new Error('Voeg minimaal één regel met omschrijving en prijs toe.');
      }

      // Create description from line items for backwards compatibility
      const description = validLineItems.map(item => item.description).join('\n');

      const invoiceData = {
        ...formData,
        description,
        price: getSubtotal(),
        vatPercentage: 21, // Default, actual VAT is per line item
        paymentTermDays: parseInt(formData.paymentTermDays),
        lineItems: validLineItems.map(item => ({
          ...item,
          unitPrice: parseFloat(item.unitPrice) || 0,
          quantity: parseFloat(item.quantity) || 1,
          vatPercentage: parseFloat(item.vatPercentage) || 21,
        })),
      };

      if (invoiceId) {
        await api.updateInvoice(accessToken, invoiceId, invoiceData);
      } else {
        await api.createInvoice(accessToken, invoiceData);
      }

      setSuccess('Factuur succesvol opgeslagen!');

      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else {
          onNavigate('invoices');
        }
      }, 1000);

    } catch (err: any) {
      console.error('Invoice save error:', err);
      setError(err.message || 'Er is een onbekende fout opgetreden bij het opslaan');
    } finally {
      setLoading(false);
    }
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
            <CardTitle>{invoiceId ? 'Factuur Bewerken' : 'Nieuwe Factuur'}</CardTitle>
            <CardDescription>
              Vul de gegevens in voor je factuur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Klantgegevens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Klantgegevens</h3>

                {/* Client selector */}
                {clients.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selecteer bestaande klant</Label>
                    <Select value={selectedClientId} onValueChange={handleClientSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een klant of voer handmatig in..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">-- Nieuwe klant (handmatig invullen) --</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} {client.city && `(${client.city})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                    <Label htmlFor="clientAddress">Klant Adres *</Label>
                    <Textarea
                      id="clientAddress"
                      value={formData.clientAddress}
                      onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Factuur details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Factuur Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Factuurdatum *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTermDays">Betalingstermijn</Label>
                    <Select
                      value={formData.paymentTermDays}
                      onValueChange={handlePaymentTermChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">14 dagen</SelectItem>
                        <SelectItem value="30">30 dagen</SelectItem>
                        <SelectItem value="60">60 dagen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Vervaldatum *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
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
                        <SelectItem value="paid">Betaald</SelectItem>
                        <SelectItem value="overdue">Vervallen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Werkzaamheden / Regels */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-semibold text-gray-700">Werkzaamheden</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    + Regel toevoegen
                  </Button>
                </div>

                {/* Table header */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-gray-600 px-2">
                  <div className="col-span-5">Omschrijving</div>
                  <div className="col-span-2">Bedrag</div>
                  <div className="col-span-2">Aantal</div>
                  <div className="col-span-2">BTW</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Line items */}
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-1 md:col-span-5">
                      <Label className="md:hidden text-xs text-gray-500">Omschrijving</Label>
                      <Input
                        placeholder="Omschrijving werkzaamheden"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-gray-500">Bedrag (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-gray-500">Aantal</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-gray-500">BTW %</Label>
                      <Select
                        value={item.vatPercentage}
                        onValueChange={(value) => updateLineItem(item.id, 'vatPercentage', value)}
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
                    <div className="col-span-1 md:col-span-1 flex items-end justify-end md:justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ×
                      </Button>
                    </div>
                    {/* Line total (shown on mobile) */}
                    <div className="col-span-1 md:hidden text-right text-sm font-medium text-gray-700">
                      Totaal: €{getLineItemTotal(item).toFixed(2)}
                    </div>
                  </div>
                ))}

                <Button type="button" variant="ghost" size="sm" onClick={addLineItem} className="w-full border-2 border-dashed">
                  + Nog een regel toevoegen
                </Button>
              </div>

              {/* Opmerkingen */}
              <div className="space-y-2">
                <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Extra opmerkingen voor op de factuur..."
                />
              </div>

              {/* Totalen */}
              {getSubtotal() > 0 && (
                <div className="bg-green-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotaal:</span>
                    <span>€{getSubtotal().toFixed(2)}</span>
                  </div>
                  {Object.entries(getVatTotals()).map(([percentage, amount]) => (
                    amount > 0 && (
                      <div key={percentage} className="flex justify-between text-gray-600">
                        <span>BTW {percentage}%:</span>
                        <span>€{amount.toFixed(2)}</span>
                      </div>
                    )
                  ))}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Totaal incl. BTW:</span>
                    <span>€{getGrandTotal().toFixed(2)}</span>
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
                  {loading ? 'Bezig...' : invoiceId ? 'Bijwerken' : 'Aanmaken'}
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
