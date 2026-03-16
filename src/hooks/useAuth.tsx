import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPersona, type PersonaConfig, type AppRole } from '@/lib/role-personas';

export type { AppRole };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  persona: PersonaConfig;
  loading: boolean;
  signInAsRole: (role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.warn('Failed to fetch roles:', error.message);
        // Don't leave app broken - set empty roles so user can still navigate
        setRoles([]);
        return;
      }
      
      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }
    } catch (err) {
      console.warn('Role fetch failed:', err);
      setRoles([]);
    }
  };

  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        initialSessionHandled = true;
        
        // Handle token errors - clear stale session
        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
          setRoles([]);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (initialSessionHandled) return;
      
      // If session is invalid (bad JWT), clear it
      if (error || (!session && error)) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAsRole = useCallback(async (role: AppRole) => {
    try {
      // Sign out any existing session first
      await supabase.auth.signOut();

      // Create anonymous session
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) return { error: anonError };

      // Assign role via SECURITY DEFINER function
      const { error: roleError } = await supabase.rpc('assign_own_role', { p_role: role });
      if (roleError) return { error: roleError };

      // Update local roles state immediately
      setRoles([role]);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  }, []);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  
  const hasAnyRole = useCallback((checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role)), [roles]);

  const persona = useMemo(() => {
    const primaryRole = roles[0] || 'viewer';
    return getPersona(primaryRole);
  }, [roles]);

  const value = useMemo(() => ({
    user,
    session,
    roles,
    persona,
    loading,
    signInAsRole,
    signOut,
    hasRole,
    hasAnyRole,
  }), [user, session, roles, persona, loading, signInAsRole, signOut, hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
