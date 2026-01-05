import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';

interface AuthPagesProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onBack: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ mode, onModeChange, onBack }) => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name, companyName);
      }
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit mb-2">
            ← Terug
          </Button>
          <CardTitle>{mode === 'signin' ? 'Inloggen' : 'Account Aanmaken'}</CardTitle>
          <CardDescription>
            {mode === 'signin' 
              ? 'Log in met je account om verder te gaan'
              : 'Maak een gratis account aan om te beginnen'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Naam</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Bedrijfsnaam</Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Bezig...' : mode === 'signin' ? 'Inloggen' : 'Account Aanmaken'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === 'signin' ? (
              <p>
                Nog geen account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signup')}
                  className="text-blue-600 hover:underline"
                >
                  Aanmelden
                </button>
              </p>
            ) : (
              <p>
                Al een account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signin')}
                  className="text-blue-600 hover:underline"
                >
                  Inloggen
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
