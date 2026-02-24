import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Session, User } from '@khepri/supabase-client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Capture supabase in a local const for TypeScript narrowing in async functions
    const client = supabase;
    let mounted = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!mounted) return;
        if (error) {
          setSession(null);
          return;
        }
        setSession(data.session ?? null);
      } catch {
        if (!mounted) return;
        setSession(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void initializeSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase is not configured') };
      }
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? new Error(error.message) : null };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error('Sign in failed') };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase is not configured') };
      }
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          return { error: new Error(error.message) };
        }
        // Supabase returns a fake success with empty identities for duplicate emails
        // (to prevent email enumeration when email confirmation is enabled)
        if (data.user?.identities?.length === 0) {
          return { error: new Error('An account with this email already exists') };
        }
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error('Sign up failed') };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // Best-effort: auth state listener handles session clearing
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [session, isLoading, isConfigured, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
