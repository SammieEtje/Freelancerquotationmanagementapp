import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthPages } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { QuotationForm } from './components/QuotationForm';
import { QuotationsList } from './components/QuotationsList';
import { QuotationDetail } from './components/QuotationDetail';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicesList } from './components/InvoicesList';
import { InvoiceDetail } from './components/InvoiceDetail';
import { ClientForm } from './components/ClientForm';
import { ClientsList } from './components/ClientsList';
import { ClientDetail } from './components/ClientDetail';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/sonner';

type Page =
  | 'landing'
  | 'signin'
  | 'signup'
  | 'dashboard'
  | 'create-quotation'
  | 'quotations'
  | 'create-invoice'
  | 'invoices'
  | 'create-client'
  | 'clients'
  | 'settings'
  | string; // for dynamic pages like quotation-detail-123, invoice-detail-123, client-detail-123

const AppContent: React.FC = () => {
  const authContext = useAuth();
  
  // Safety check
  if (!authContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Er is een fout opgetreden bij het laden van de applicatie.</p>
          <p className="text-gray-600 mt-2">Ververs de pagina om opnieuw te proberen.</p>
        </div>
      </div>
    );
  }

  const { user, loading } = authContext;
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleNavigate = (page: Page) => {
    console.log('Navigating to:', page);
    setCurrentPage(page);
  };

  // Handle redirects with useEffect instead of during render
  useEffect(() => {
    if (!loading) {
      // If user is logged in and on landing/auth pages, redirect to dashboard
      if (user && (currentPage === 'landing' || currentPage === 'signin' || currentPage === 'signup')) {
        console.log('User logged in, redirecting to dashboard');
        setCurrentPage('dashboard');
      }
      // If user is not logged in and trying to access protected pages, redirect to landing
      else if (!user && currentPage !== 'landing' && currentPage !== 'signin' && currentPage !== 'signup') {
        console.log('User not logged in, redirecting to landing');
        setCurrentPage('landing');
      }
    }
  }, [user, loading, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  // Render appropriate page
  if (!user) {
    if (currentPage === 'signin' || currentPage === 'signup') {
      return (
        <AuthPages
          mode={authMode}
          onModeChange={setAuthMode}
          onBack={() => setCurrentPage('landing')}
        />
      );
    }

    return (
      <LandingPage
        onSignUp={() => {
          setAuthMode('signup');
          setCurrentPage('signup');
        }}
        onSignIn={() => {
          setAuthMode('signin');
          setCurrentPage('signin');
        }}
      />
    );
  }

  // Authenticated pages
  if (currentPage === 'dashboard') {
    return <Dashboard onNavigate={handleNavigate} />;
  }

  if (currentPage === 'create-quotation') {
    return <QuotationForm onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('edit-quotation-')) {
    const quotationId = currentPage.replace('edit-quotation-', '');
    return (
      <QuotationForm
        quotationId={quotationId}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'quotations') {
    return <QuotationsList onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('quotation-detail-')) {
    const quotationId = currentPage.replace('quotation-detail-', '');
    return (
      <QuotationDetail
        quotationId={quotationId}
        onNavigate={handleNavigate}
      />
    );
  }

  // Invoice routes
  if (currentPage === 'create-invoice') {
    return <InvoiceForm onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('edit-invoice-')) {
    const invoiceId = currentPage.replace('edit-invoice-', '');
    return (
      <InvoiceForm
        invoiceId={invoiceId}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'invoices') {
    return <InvoicesList onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('invoice-detail-')) {
    const invoiceId = currentPage.replace('invoice-detail-', '');
    return (
      <InvoiceDetail
        invoiceId={invoiceId}
        onNavigate={handleNavigate}
      />
    );
  }

  // Client routes
  if (currentPage === 'create-client') {
    return <ClientForm onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('edit-client-')) {
    const clientId = currentPage.replace('edit-client-', '');
    return (
      <ClientForm
        clientId={clientId}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'clients') {
    return <ClientsList onNavigate={handleNavigate} />;
  }

  if (currentPage.startsWith('client-detail-')) {
    const clientId = currentPage.replace('client-detail-', '');
    return (
      <ClientDetail
        clientId={clientId}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === 'settings') {
    return <Settings onNavigate={handleNavigate} />;
  }

  // Fallback to dashboard
  return <Dashboard onNavigate={handleNavigate} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
};

export default App;