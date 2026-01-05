import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { projectId } from '../../../utils/supabase/info';
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
      // Fetch quotation
      const quotationResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/quotations/${quotationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      // Fetch profile
      const profileResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/profile`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (quotationResponse.ok && profileResponse.ok) {
        const quotationData = await quotationResponse.json();
        const profileData = await profileResponse.json();
        setQuotation(quotationData.quotation);
        setProfile(profileData.profile);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze offerte wilt verwijderen?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-82bafaab/quotations/${quotationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        onNavigate('quotations');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
    }
  };

  const exportToPDF = () => {
    if (!quotation || !profile) {
      alert('Gegevens worden geladen, probeer het over een moment opnieuw.');
      return;
    }

    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Company header
      doc.setFontSize(20);
      doc.text(profile.companyName || 'Bedrijfsnaam', 20, y);
      y += 10;

      doc.setFontSize(10);
      if (profile.address) {
        doc.text(profile.address, 20, y);
        y += 5;
      }
      if (profile.phone) {
        doc.text(`Tel: ${profile.phone}`, 20, y);
        y += 5;
      }
      if (profile.email) {
        doc.text(`E-mail: ${profile.email}`, 20, y);
        y += 5;
      }
      if (profile.kvkNumber) {
        doc.text(`KvK: ${profile.kvkNumber}`, 20, y);
        y += 5;
      }
      if (profile.vatNumber) {
        doc.text(`BTW: ${profile.vatNumber}`, 20, y);
        y += 5;
      }

      y += 15;

      // Quotation title
      doc.setFontSize(16);
      doc.text('OFFERTE', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.text(`Offertenummer: ${quotation.quotationNumber}`, 20, y);
      y += 5;
      doc.text(`Datum: ${new Date(quotation.date).toLocaleDateString('nl-NL')}`, 20, y);
      y += 15;

      // Client info
      doc.setFontSize(12);
      doc.text('Klantgegevens', 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.text(quotation.clientName, 20, y);
      y += 5;
      const clientAddressLines = quotation.clientAddress.split('\n');
      clientAddressLines.forEach((line: string) => {
        doc.text(line, 20, y);
        y += 5;
      });

      y += 10;

      // Description
      doc.setFontSize(12);
      doc.text('Omschrijving werkzaamheden', 20, y);
      y += 7;

      doc.setFontSize(10);
      const descriptionLines = doc.splitTextToSize(quotation.description, pageWidth - 40);
      descriptionLines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 5;
      });

      y += 10;

      // Financial details
      const vatAmount = (quotation.price * quotation.vatPercentage) / 100;
      const totalAmount = quotation.price + vatAmount;

      doc.setFontSize(10);
      doc.text('Prijs (excl. BTW):', 120, y);
      doc.text(`€ ${quotation.price.toFixed(2)}`, pageWidth - 40, y, { align: 'right' });
      y += 7;

      doc.text(`BTW (${quotation.vatPercentage}%):`, 120, y);
      doc.text(`€ ${vatAmount.toFixed(2)}`, pageWidth - 40, y, { align: 'right' });
      y += 7;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Totaal (incl. BTW):', 120, y);
      doc.text(`€ ${totalAmount.toFixed(2)}`, pageWidth - 40, y, { align: 'right' });

      // Footer
      y = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Bedankt voor uw vertrouwen!', pageWidth / 2, y, { align: 'center' });

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

  const calculateVat = () => {
    if (!quotation) return 0;
    return (quotation.price * quotation.vatPercentage) / 100;
  };

  const calculateTotal = () => {
    if (!quotation) return 0;
    return quotation.price + calculateVat();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Concept';
      case 'sent': return 'Verstuurd';
      case 'accepted': return 'Geaccepteerd';
      default: return status;
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
              <span className={`text-sm px-3 py-1 rounded ${
                quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                quotation.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
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
                <span>€{calculateVat().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Totaal incl. BTW:</span>
                <span>€{calculateTotal().toFixed(2)}</span>
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