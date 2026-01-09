import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { api } from '../../utils/apiClient';
import { getStatusLabel, getStatusColor } from '../../utils/statusHelpers';
import { calculateVat, calculateTotal } from '../../utils/calculations';
import jsPDF from 'jspdf';

interface QuotationDetailProps {
  quotationId: string;
  onNavigate: (page: string) => void;
}

export const QuotationDetail: React.FC<QuotationDetailProps> = ({ quotationId, onNavigate }) => {
  const { accessToken } = useAuth();
  const [quotation, setQuotation] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [quotationId, accessToken]);

  const fetchData = async () => {
    if (!accessToken) return;

    try {
      const [quotationData, profileData] = await Promise.all([
        api.getQuotation(accessToken, quotationId),
        api.getProfile(accessToken),
      ]);
      setQuotation(quotationData.quotation);
      setProfile(profileData.profile);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze offerte wilt verwijderen?')) return;
    if (!accessToken) return;

    try {
      await api.deleteQuotation(accessToken, quotationId);
      onNavigate('quotations');
    } catch (error) {
      console.error('Error deleting quotation:', error);
    }
  };

  const exportToPDF = async () => {
    if (!quotation || !profile) {
      alert('Gegevens worden geladen, probeer het over een moment opnieuw.');
      return;
    }

    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const rightCol = 120; // Start of right column
      let y = margin;

      // Colors
      const primaryColor: [number, number, number] = [0, 102, 153]; // Professional blue
      const grayColor: [number, number, number] = [100, 100, 100];
      const darkColor: [number, number, number] = [40, 40, 40];
      const accentColor: [number, number, number] = [180, 80, 60]; // Warm accent for footer

      // === HEADER SECTION ===
      // Logo (left side) - larger size
      if (profile.logo) {
        try {
          doc.addImage(profile.logo, 'AUTO', margin, y, 50, 25, undefined, 'FAST');
        } catch (e) {
          console.log('Could not add logo:', e);
          // Fallback: show company name on left if no logo
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(profile.companyName || 'Bedrijfsnaam', margin, y + 15);
        }
      } else {
        // No logo - show company name prominently
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
      }

      y += 50;

      // === CLIENT INFO (left) ===
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkColor);
      doc.text(quotation.clientName, margin, y);
      y += 5;

      doc.setTextColor(...grayColor);
      const clientAddressLines = quotation.clientAddress.split('\n');
      clientAddressLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 5;
      });

      y += 20;

      // === OFFERTE TITLE ===
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('Offerte', margin, y);

      y += 12;

      // === OFFERTE DETAILS ===
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);

      const labelX = margin;
      const valueX = margin + 35;

      doc.text('Offertenummer:', labelX, y);
      doc.setTextColor(...darkColor);
      doc.text(quotation.quotationNumber, valueX, y);
      y += 6;

      doc.setTextColor(...grayColor);
      doc.text('Offertedatum:', labelX, y);
      doc.setTextColor(...darkColor);
      doc.text(new Date(quotation.date).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), valueX, y);
      y += 6;

      // Expiry date (use stored value or calculate 30 days from quotation date)
      const validUntil = quotation.expiryDate
        ? new Date(quotation.expiryDate)
        : (() => { const d = new Date(quotation.date); d.setDate(d.getDate() + 30); return d; })();
      doc.setTextColor(...grayColor);
      doc.text('Geldig tot:', labelX, y);
      doc.setTextColor(...darkColor);
      doc.text(validUntil.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), valueX, y);

      y += 15;

      // === TABLE HEADER ===
      const col1 = margin; // Omschrijving
      const col2 = 115; // Bedrag
      const col3 = 145; // Aantal
      const col4 = pageWidth - margin; // Totaal (right aligned)

      // Header line
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

      // Format price with euro sign and comma for decimals
      const formatPrice = (price: number) => {
        return price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // === TABLE CONTENT ===
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);

      // Check if quotation has line items (new format) or single description (old format)
      const lineItems = quotation.lineItems && quotation.lineItems.length > 0
        ? quotation.lineItems
        : [{
            description: quotation.description,
            unitPrice: quotation.price,
            quantity: 1,
            vatPercentage: quotation.vatPercentage
          }];

      // Render each line item
      lineItems.forEach((item: any) => {
        const itemTotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1);

        // Check if we need a new page
        if (y > pageHeight - 80) {
          doc.addPage();
          y = margin;
        }

        // Description (truncate if too long)
        const descLines = doc.splitTextToSize(item.description || '', 85);
        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.text(descLines[0] || '', col1, y);

        // Unit price
        doc.text(`€`, col2, y);
        doc.text(formatPrice(parseFloat(item.unitPrice) || 0), col2 + 8, y);

        // Quantity
        doc.text(String(item.quantity || 1), col3, y);

        // Line total
        doc.text(`€`, col4 - 25, y);
        doc.text(formatPrice(itemTotal), col4, y, { align: 'right' });

        // Additional description lines if any
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

      // Calculate totals from line items
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

      // Subtotal
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text('Subtotaal', totalsLabelX, y);
      doc.text('€', totalsValueX - 25, y);
      doc.setTextColor(...darkColor);
      doc.text(formatPrice(subtotal), totalsValueX, y, { align: 'right' });

      y += 7;

      // VAT lines (per percentage)
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

      // Total
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkColor);
      doc.text('Totaal', totalsLabelX, y);
      doc.text('€', totalsValueX - 30, y);
      doc.setFontSize(12);
      doc.text(formatPrice(grandTotal), totalsValueX, y, { align: 'right' });

      // === FOOTER MESSAGE ===
      const footerY = pageHeight - 40;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...accentColor);

      const footerText = 'Wij verzoeken u vriendelijk om bij akkoord deze offerte ondertekend te retourneren.';
      const footerLines = doc.splitTextToSize(footerText, pageWidth - (margin * 2));

      footerLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, footerY + (index * 5), { align: 'center' });
      });

      // Save PDF
      const fileName = `Offerte-${quotation.quotationNumber}.pdf`;
      console.log('Saving PDF as:', fileName);
      doc.save(fileName);

      // Show success message
      alert('PDF succesvol gedownload!');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Er is een fout opgetreden bij het maken van de PDF. Probeer het opnieuw.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Laden...</div>;
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Offerte niet gevonden</p>
          <Button onClick={() => onNavigate('quotations')}>Terug naar Overzicht</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => onNavigate('quotations')}>
              ← Terug naar Overzicht
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onNavigate(`edit-quotation-${quotationId}`)}>
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
                <CardTitle className="text-2xl mb-2">Offerte Details</CardTitle>
                <p className="text-gray-600">{quotation.quotationNumber}</p>
              </div>
              <span className={`text-sm px-3 py-1 rounded ${getStatusColor(quotation.status)}`}>
                {getStatusLabel(quotation.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Klantgegevens</h3>
              <p className="font-medium">{quotation.clientName}</p>
              <p className="text-gray-600 whitespace-pre-line">{quotation.clientAddress}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Datum</h3>
              <p>{new Date(quotation.date).toLocaleDateString('nl-NL', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Omschrijving Werkzaamheden</h3>
              <p className="text-gray-700 whitespace-pre-line">{quotation.description}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Prijs excl. BTW:</span>
                <span>€{quotation.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BTW ({quotation.vatPercentage}%):</span>
                <span>€{calculateVat(quotation.price, quotation.vatPercentage).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Totaal incl. BTW:</span>
                <span>€{calculateTotal(quotation.price, quotation.vatPercentage).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
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