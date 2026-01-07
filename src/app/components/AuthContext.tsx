import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface AuthContextType {
  user: any;
  accessToken: string | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, companyName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        console.log('Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Error getting session:', error);
        }
        
        if (session) {
          console.log('Session found, user:', session.user.email);
          console.log('Access token present:', !!session.access_token);
          console.log('Token expires at:', new Date(session.expires_at! * 1000).toLocaleString());
          
          // Check if token is about to expire (within 5 minutes)
          const expiresAt = session.expires_at! * 1000;
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (expiresAt - now < fiveMinutes) {
            console.log('Token is about to expire, refreshing...');
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            if (newSession) {
              console.log('Token refreshed successfully');
              setUser(newSession.user);
              setAccessToken(newSession.access_token);
            } else {
              console.log('Token refresh failed:', refreshError);
              setUser(session.user);
              setAccessToken(session.access_token);
            }
          } else {
            setUser(session.user);
            setAccessToken(session.access_token);
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.log('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      console.log('New session user:', session?.user?.email || 'none');
      console.log('Access token present:', !!session?.access_token);
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, companyName: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name, companyName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Provide better Dutch error messages
        let errorMessage = data.error || 'Aanmelden mislukt';
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          errorMessage = 'Dit e-mailadres is al in gebruik. Probeer in te loggen.';
        } else if (errorMessage.includes('password')) {
          errorMessage = 'Wachtwoord moet minimaal 6 tekens bevatten.';
        }
        throw new Error(errorMessage);
      }

      // Now sign in
      await signIn(email, password);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide better Dutch error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Ongeldige inloggegevens. Controleer je e-mail en wachtwoord, of maak eerst een account aan.');
        }
        throw new Error(error.message);
      }

      setUser(data.user);
      setAccessToken(data.session?.access_token ?? null);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };