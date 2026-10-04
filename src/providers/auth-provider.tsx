import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  retryRole: () => void;
  role: 'student' | 'teacher' | null;
  roleError: string | null;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(supabase));
  const [resolvedRole, setResolvedRole] = useState<{
    request: number;
    userId: string;
    value: 'student' | 'teacher';
  } | null>(null);
  const [roleFailure, setRoleFailure] = useState<{
    message: string;
    request: number;
    userId: string;
  } | null>(null);
  const [roleRequest, setRoleRequest] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    client.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          console.warn('Unable to restore the Supabase session:', error.message);
        }

        setSession(data.session);
        setIsInitializing(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        console.warn('Unable to restore the Supabase session:', error);
        setIsInitializing(false);
      });

    const { data: authListener } = client.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setResolvedRole(null);
          setRoleFailure(null);
          setRoleRequest((current) => current + 1);
        }
        setSession(nextSession);
        setIsInitializing(false);
      },
    );

    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) {
      return;
    }

    const client = supabase;
    const activeUserId = userId;
    let isActive = true;
    async function resolveRole() {
      const { data, error } = await client
        .from('app_config')
        .select('teacher_id')
        .eq('id', true)
        .single();

      if (!isActive) return;
      if (error) throw error;

      setRoleFailure(null);
      setResolvedRole({
        request: roleRequest,
        userId: activeUserId,
        value: data.teacher_id === activeUserId ? 'teacher' : 'student',
      });
    }

    resolveRole().catch((error: unknown) => {
      if (!isActive) return;
      setResolvedRole(null);
      console.warn('Unable to determine account role:', error);
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : null;
      const setupError = code === 'PGRST116' || code === 'PGRST205' || code === '42P01' || code === '42501';
      setRoleFailure({
        message: setupError
          ? 'Student access is not configured in Supabase. Ask the teacher to apply the student access migration, then try again.'
          : 'Unable to check account access. Check your connection and try again.',
        request: roleRequest,
        userId: activeUserId,
      });
    });

    return () => {
      isActive = false;
    };
  }, [userId, roleRequest]);

  const role = resolvedRole?.userId === userId && resolvedRole?.request === roleRequest
    ? resolvedRole.value
    : null;
  const roleError = !role && roleFailure?.userId === userId && roleFailure?.request === roleRequest
    ? roleFailure.message
    : null;
  const isLoading = isInitializing || Boolean(userId && !role && !roleError);

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      retryRole: () => {
        setRoleRequest((current) => current + 1);
      },
      role,
      roleError,
      session,
    }),
    [isLoading, role, roleError, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
