import React from 'react';
import { Button } from './ui/button';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignUp, onSignIn }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-900">OfferteApp</h1>
        <div className="space-x-4">
          <Button variant="ghost" onClick={onSignIn}>
            Inloggen
          </Button>
          <Button onClick={onSignUp}>
            Aanmelden
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Maak professionele offertes in minuten
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Een eenvoudige tool voor Nederlandse ZZP'ers om snel offertes te maken. 
            Geen ingewikkelde boekhouding, gewoon simpel en effectief.
          </p>
          <Button size="lg" onClick={onSignUp} className="text-lg px-8 py-6">
            Gratis Beginnen
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold mb-2">Snel Offertes Maken</h3>
            <p className="text-gray-600 text-sm">
              Vul eenvoudig de gegevens in en genereer direct een professionele offerte
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="font-semibold mb-2">Professioneel PDF</h3>
            <p className="text-gray-600 text-sm">
              Download je offertes als nette PDF-bestanden om te versturen naar klanten
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Overzicht</h3>
            <p className="text-gray-600 text-sm">
              Houd al je offertes bij met een duidelijk overzicht en statusbeheer
            </p>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-gray-600 text-sm">
        <p>© 2026 OfferteApp - Voor Nederlandse ZZP'ers</p>
      </footer>
    </div>
  );
};
