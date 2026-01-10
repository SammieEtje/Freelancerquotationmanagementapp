import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';
import { calculateVat, calculateTotal } from '../../utils/calculations';
import jsPDF from 'jspdf';

interface InvoiceDetailProps {
  invoiceId: string;
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

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onNavigate }) => {
  const { accessToken } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [invoiceId, accessToken]);

  const fetchData = async () => {
    if (!accessToken) return;

    try {
      const [invoiceData, profileData] = await Promise.all([
        api.getInvoice(accessToken, invoiceId),
        api.getProfile(accessToken),
      ]);
      setInvoice(invoiceData.invoice);
      setProfile(profileData.profile);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen?')) return;
    if (!accessToken) return;

    try {
      await api.deleteInvoice(accessToken, invoiceId);
      onNavigate('invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!accessToken) return;

    try {
      await api.updateInvoice(accessToken, invoiceId, {
        status: 'paid',
        paidDate: new Date().toISOString(),
      });
      fetchData();
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const exportToPDF = async () => {
    if (!invoice || !profile) {
      alert('Gegevens worden geladen, probeer het over een moment opnieuw.');
      return;
    }

    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const rightCol = 120;
      let y = margin;

      // Colors
      const primaryColor: [number, number, number] = [0, 102, 153];
      const grayColor: [number, number, number] = [100, 100, 100];
      const darkColor: [number, number, number] = [40, 40, 40];
      const accentColor: [number, number, number] = [34, 139, 34]; // Green for invoices

      // === HEADER SECTION ===
      // Logo (left side)
      if (profile.logo) {
        try {
          doc.addImage(profile.logo, 'AUTO', margin, y, 50, 25, undefined, 'FAST');
        } catch (e) {
          console.log('Could not add logo:', e);
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(profile.companyName || 'Bedrijfsnaam', margin, y + 15);
        }
      } else {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(profile.companyName || 'Bedrijfsnaam', margin, y + 15);
      }

      // Company info (right side)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text(profile.companyName || '', rightCol, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      let rightY = y + 12;

      if (profile.address) {
        const addressLines = profile.address.split('\n');
        addressLines.forEach((line: string) => {
          doc.text(line, rightCol, rightY);
          rightY += 5;
        });
      }
      rightY += 2;
      if (profile.phone) {
        doc.text(profile.phone, rightCol, rightY);
        rightY += 5;
      }
      if (profile.email) {
        doc.setTextColor(...primaryColor);
        doc.text(profile.email, rightCol, rightY);
        rightY += 7;
      }
      doc.setTextColor(...grayColor);
      if (profile.kvkNumber) {
        doc.text(`KvK: ${profile.kvkNumber}`, rightCol, rightY);
        rightY += 5;
      }
      if (profile.vatNumber) {
        doc.text(profile.vatNumber, rightCol, rightY);
        rightY += 5;
      }
      // Bank details for invoices
      if (profile.iban) {
        doc.text(`IBAN: ${profile.iban}`, rightCol, rightY);
      }

      y += 50;

      // === CLIENT INFO (left) ===
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkColor);
      doc.text(invoice.clientName, margin, y);
      y += 5;

      doc.setTextColor(...grayColor);
      const clientAddressLines = invoice.clientAddress.split('\n');
      clientAddressLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 5;
      });

      y += 20;

      // === FACTUUR TITLE ===
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('Factuur', margin, y);

      // Paid stamp if applicable
      if (invoice.status === 'paid') {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accentColor);
        doc.text('BETAALD', pageWidth - margin - 30, y, { align: 'right' });
      }

      y += 12;

      // === FACTUUR DETAILS ===
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);

      const labelX = margin;
      const valueX = margin + 35;

      doc.text('Factuurnummer:', labelX, y);
      doc.setTextColor(...darkColor);
      doc.text(invoice.invoiceNumber, valueX, y);
      y += 6;

      doc.setTextColor(...grayColor);
      doc.text('Factuurdatum:', labelX, y);
      doc.setTextColor(...darkColor);
      doc.text(new Date(invoice.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), valueX, y);
      y += 6;

      if (invoice.dueDate) {
        doc.setTextColor(...grayColor);
        doc.text('Vervaldatum:', labelX, y);
        doc.setTextColor(...darkColor);
        doc.text(new Date(invoice.dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), valueX, y);
        y += 6;
      }

      if (invoice.quotationNumber) {
        doc.setTextColor(...grayColor);
        doc.text('Offerte ref:', labelX, y);
        doc.setTextColor(...darkColor);
        doc.text(invoice.quotationNumber, valueX, y);
        y += 6;
      }

      y += 10;

      // === TABLE HEADER ===
      const col1 = margin;
      const col2 = 115;
      const col3 = 145;
      const col4 = pageWidth - margin;

      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...primaryColor);
      doc.text('Omschrijving', col1, y);
      doc.text('Bedrag', col2, y);
      doc.text('Aantal', col3, y);
      doc.text('Totaal', col4, y, { align: 'right' });

      y += 4;
      doc.setDrawColor(...primaryColor);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      const formatPrice = (price: number) => {
        return price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // === TABLE CONTENT ===
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);

      const lineItems = invoice.lineItems && invoice.lineItems.length > 0
        ? invoice.lineItems
        : [{
            description: invoice.description,
            unitPrice: invoice.price,
            quantity: 1,
            vatPercentage: invoice.vatPercentage
          }];

      lineItems.forEach((item: any) => {
        const itemTotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1);

        if (y > pageHeight - 80) {
          doc.addPage();
          y = margin;
        }

        const descLines = doc.splitTextToSize(item.description || '', 85);
        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.text(descLines[0] || '', col1, y);

        doc.text(`€`, col2, y);
        doc.text(formatPrice(parseFloat(item.unitPrice) || 0), col2 + 8, y);

        doc.text(String(item.quantity || 1), col3, y);

        doc.text(`€`, col4 - 25, y);
        doc.text(formatPrice(itemTotal), col4, y, { align: 'right' });

        if (descLines.length > 1) {
          for (let i = 1; i < Math.min(descLines.length, 3); i++) {
            y += 5;
            doc.setTextColor(...grayColor);
            doc.setFontSize(9);
            doc.text(descLines[i], col1, y);
          }
        }

        y += 8;
      });

      y += 10;

      // === TOTALS SECTION ===
      const totalsLabelX = 130;
      const totalsValueX = pageWidth - margin;

      let subtotal = 0;
      const vatTotals: { [key: string]: number } = {};

      lineItems.forEach((item: any) => {
        const itemTotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1);
        subtotal += itemTotal;
        const vatPct = String(item.vatPercentage || 21);
        if (!vatTotals[vatPct]) vatTotals[vatPct] = 0;
        vatTotals[vatPct] += (itemTotal * parseFloat(vatPct)) / 100;
      });

      const totalVat = Object.values(vatTotals).reduce((sum, v) => sum + v, 0);
      const grandTotal = subtotal + totalVat;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text('Subtotaal', totalsLabelX, y);
      doc.text('€', totalsValueX - 25, y);
      doc.setTextColor(...darkColor);
      doc.text(formatPrice(subtotal), totalsValueX, y, { align: 'right' });

      y += 7;

      Object.entries(vatTotals).forEach(([pct, amount]) => {
        if (amount > 0) {
          doc.setTextColor(...grayColor);
          doc.text(`${pct}% btw`, totalsLabelX, y);
          doc.text('€', totalsValueX - 25, y);
          doc.setTextColor(...darkColor);
          doc.text(formatPrice(amount), totalsValueX, y, { align: 'right' });
          y += 7;
        }
      });

      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('Totaal', totalsLabelX, y);
      doc.text('€', totalsValueX - 30, y);
      doc.setFontSize(12);
      doc.text(formatPrice(grandTotal), totalsValueX, y, { align: 'right' });

      // === PAYMENT INFO ===
      y += 20;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkColor);
      doc.text('Betalingsgegevens:', margin, y);
      y += 6;

      doc.setTextColor(...grayColor);
      if (profile.iban) {
        doc.text(`IBAN: ${profile.iban}`, margin, y);
        y += 5;
      }
      doc.text(`t.n.v. ${profile.companyName}`, margin, y);
      y += 5;
      doc.text(`o.v.v. ${invoice.invoiceNumber}`, margin, y);

      // === FOOTER MESSAGE ===
      const footerY = pageHeight - 35;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...accentColor);

      const footerText = `Wij verzoeken u vriendelijk het totaalbedrag van €${formatPrice(grandTotal)} binnen ${invoice.paymentTermDays || 30} dagen over te maken.`;
      const footerLines = doc.splitTextToSize(footerText, pageWidth - (margin * 2));

      footerLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, footerY + (index * 5), { align: 'center' });
      });

      // Notes if present
      if (invoice.notes) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grayColor);
        const notesY = footerY + footerLines.length * 5 + 5;
        const notesLines = doc.splitTextToSize(`Opmerking: ${invoice.notes}`, pageWidth - (margin * 2));
        notesLines.forEach((line: string, index: number) => {
          doc.text(line, pageWidth / 2, notesY + (index * 4), { align: 'center' });
        });
      }

      // Save PDF
      const fileName = `Factuur-${invoice.invoiceNumber}.pdf`;
      console.log('Saving PDF as:', fileName);
      doc.save(fileName);

      alert('PDF succesvol gedownload!');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Er is een fout opgetreden bij het maken van de PDF. Probeer het opnieuw.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Laden...</div>;
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Factuur niet gevonden</p>
          <Button onClick={() => onNavigate('invoices')}>Terug naar Overzicht</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => onNavigate('invoices')}>
              ← Terug naar Overzicht
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onNavigate(`edit-invoice-${invoiceId}`)}>
                Bewerken
              </Button>
              <Button onClick={exportToPDF}>
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">Factuur Details</CardTitle>
                <p className="text-gray-600">{invoice.invoiceNumber}</p>
                {invoice.quotationNumber && (
                  <p className="text-sm text-gray-500 mt-1">
                    Op basis van offerte: {invoice.quotationNumber}
                  </p>
                )}
              </div>
              <span className={`text-sm px-3 py-1 rounded ${getInvoiceStatusColor(invoice.status)}`}>
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Klantgegevens</h3>
              <p className="font-medium">{invoice.clientName}</p>
              <p className="text-gray-600 whitespace-pre-line">{invoice.clientAddress}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Factuurdatum</h3>
                <p>{new Date(invoice.date).toLocaleDateString('nl-NL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <h3 className="font-semibold mb-2">Vervaldatum</h3>
                  <p>{new Date(invoice.dueDate).toLocaleDateString('nl-NL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Omschrijving Werkzaamheden</h3>
              <p className="text-gray-700 whitespace-pre-line">{invoice.description}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Prijs excl. BTW:</span>
                <span>€{invoice.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BTW ({invoice.vatPercentage}%):</span>
                <span>€{calculateVat(invoice.price, invoice.vatPercentage).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Totaal incl. BTW:</span>
                <span>€{calculateTotal(invoice.price, invoice.vatPercentage).toFixed(2)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div>
                <h3 className="font-semibold mb-2">Opmerkingen</h3>
                <p className="text-gray-700">{invoice.notes}</p>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              {invoice.status !== 'paid' && (
                <Button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700">
                  Markeer als Betaald
                </Button>
              )}
              <Button variant="destructive" onClick={handleDelete}>
                Verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
