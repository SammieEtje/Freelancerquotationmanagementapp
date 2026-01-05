import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthPages } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { QuotationForm } from './components/QuotationForm';
import { QuotationsList } from './components/QuotationsList';
import { QuotationDetail } from './components/QuotationDetail';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/sonner';

type Page = 
  | 'landing' 
  | 'signin' 
  | 'signup' 
  | 'dashboard' 
  | 'create-quotation' 
  | 'quotations' 
  | 'settings'
  | string; // for dynamic pages like quotation-detail-123

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