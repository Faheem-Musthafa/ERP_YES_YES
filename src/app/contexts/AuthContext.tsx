import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { UserRole } from '../types/database';

interface User {
  id: string;
  email: string;
  full_name: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  employee_id: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

async function fetchUserProfile(authId: string, email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, is_active, must_change_password, employee_id')
      .eq('id', authId)
      .single();

    if (error || !data) return null;

    const row = data as {
      id: string;
      full_name: string;
      role: UserRole;
      is_active: boolean;
      must_change_password: boolean | null;
      employee_id: string | null;
    };

    return {
      id: row.id,
      email,
      full_name: row.full_name,
      name: row.full_name,
      role: row.role,
      is_active: row.is_active,
      must_change_password: row.must_change_password ?? false,
      employee_id: row.employee_id ?? null,
    };
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // *** SYNCHRONOUS handler *** — must NOT be async.
      // Calling supabase DB queries (even via fetchUserProfile) directly inside an async
      // onAuthStateChange handler causes a deadlock with Supabase's internal token refresh
      // on page reload: the DB query internally calls getSession() which waits for the
      // token refresh, but the token refresh fires TOKEN_REFRESHED which can't be processed
      // until the current INITIAL_SESSION handler returns â†’ deadlock â†’ loading loop.
      //
      // Fix: Keep handler sync, defer DB work to next macrotask via setTimeout(0).
      (event, session) => {
        setTimeout(async () => {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setLoading(false);
            return;
          }

          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id, session.user.email ?? '');
            setUser(profile);
          } else {
            setUser(null);
          }

          // Only mark loading as done after the initial session check
          if (event === 'INITIAL_SESSION') {
            setLoading(false);
          }
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (!error && authUser) {
      const profile = await fetchUserProfile(authUser.id, authUser.email ?? '');
      setUser(profile);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
