import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Profile, AuthState, UserRole } from '@/types';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<Profile>) => Promise<void>;
  registerBarbershop: (payload: { ownerName: string; ownerEmail: string; ownerPassword: string; ownerPhone?: string; barbershopName: string; address?: string; location: string; phone?: string; description?: string; openingHours?: { openHour: number; closeHour: number } }) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = 'jwt';
const USER_STORAGE_KEY = 'auth_user';

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
};

const getTokenExpiresAt = (token: string): number | null => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef<number | null>(null);
  const sessionToastShownRef = useRef<boolean>(false);

  const isUserRole = (value: unknown): value is UserRole =>
    value === 'client' || value === 'barber' || value === 'admin' || value === 'owner';

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const clearSession = useCallback((options?: { notify?: boolean; reason?: 'expired' | 'unauthorized' }) => {
    const hadToken = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
    clearLogoutTimer();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);

    if (options?.notify && hadToken && !sessionToastShownRef.current) {
      sessionToastShownRef.current = true;
      toast({
        title: options.reason === 'unauthorized' ? 'Sesion cerrada' : 'Sesion expirada',
        description:
          options.reason === 'unauthorized'
            ? 'Tu sesion ya no es valida. Inicia sesion nuevamente.'
            : 'Tu sesion vencio por tiempo. Inicia sesion nuevamente.',
        variant: 'destructive',
      });
    }
  }, [clearLogoutTimer]);

  const scheduleAutoLogout = useCallback((token: string) => {
    clearLogoutTimer();
    const expiresAt = getTokenExpiresAt(token);
    if (!expiresAt) return;

    const msUntilExpiration = expiresAt - Date.now();
    if (msUntilExpiration <= 0) {
      clearSession({ notify: true, reason: 'expired' });
      return;
    }

    logoutTimerRef.current = window.setTimeout(() => {
      clearSession({ notify: true, reason: 'expired' });
    }, msUntilExpiration);
  }, [clearLogoutTimer, clearSession]);

  useEffect(() => {
    // Restaurar sesión desde localStorage si existe
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (token && storedUser) {
        const expiresAt = getTokenExpiresAt(token);
        if (expiresAt && expiresAt <= Date.now()) {
          clearSession({ notify: true, reason: 'expired' });
          return;
        }
        const parsed = JSON.parse(storedUser) as Profile;
        setUser(parsed);
        setIsAuthenticated(true);
        scheduleAutoLogout(token);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession, scheduleAutoLogout]);

  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: 'expired' | 'unauthorized' }>).detail?.reason ?? 'unauthorized';
      clearSession({ notify: true, reason });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      clearLogoutTimer();
    };
  }, [clearLogoutTimer, clearSession]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user: backendUser } = res.data as { token: string; user: { id: string; name: string; email: string; role: string; barbershopId?: string | null } };
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      const role: UserRole = isUserRole(backendUser.role) ? backendUser.role : 'client';
      const authUser: Profile = {
        id: backendUser.id,
        name: backendUser.name,
        role,
        schedule: null,
        photo: '',
        bio: '',
        services: null,
        barbershop_id: backendUser.barbershopId || undefined,
        created_at: '',
        updated_at: '',
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
      sessionToastShownRef.current = false;
      scheduleAutoLogout(token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, userData: Partial<Profile>) => {
    setLoading(true);
    try {
      const payload = {
        name: userData.name,
        email,
        password,
        phone: userData.phone,
        role: 'client',
      };
      const res = await api.post('/api/auth/register', payload);
      const { token, user: backendUser } = res.data as { token: string; user: { id: string; name: string; email: string; role: string; phone?: string; barbershopId?: string | null } };
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      const role: UserRole = isUserRole(backendUser.role) ? backendUser.role : 'client';
      const authUser: Profile = {
        id: backendUser.id,
        name: backendUser.name,
        role,
        phone: backendUser.phone,
        schedule: null,
        photo: '',
        bio: '',
        services: null,
        barbershop_id: backendUser.barbershopId || undefined,
        created_at: '',
        updated_at: '',
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
      sessionToastShownRef.current = false;
      scheduleAutoLogout(token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const registerBarbershop = async (payload: { ownerName: string; ownerEmail: string; ownerPassword: string; ownerPhone?: string; barbershopName: string; address?: string; location?: string; phone?: string; description?: string; openingHours?: { openHour: number; closeHour: number } }) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register-barbershop', payload);
      const { token, user: backendUser } = res.data as { token: string; user: { id: string; name: string; email: string; role: string; barbershopId?: string | null } };
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      const role: UserRole = isUserRole(backendUser.role) ? backendUser.role : 'client';
      const authUser: Profile = {
        id: backendUser.id,
        name: backendUser.name,
        role,
        schedule: null,
        photo: '',
        bio: '',
        services: null,
        barbershop_id: backendUser.barbershopId || undefined,
        created_at: '',
        updated_at: '',
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
      sessionToastShownRef.current = false;
      scheduleAutoLogout(token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    clearSession();
  };

  const resetPassword = async (email: string) => {
    await api.post('/api/auth/forgot-password', { email });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        registerBarbershop,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
