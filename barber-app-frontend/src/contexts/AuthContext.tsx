import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, AuthState, UserRole } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<Profile>) => Promise<void>;
  registerBarbershop: (payload: { ownerName: string; ownerEmail: string; ownerPassword: string; ownerPhone?: string; barbershopName: string; address?: string; location: string; phone?: string; description?: string; openingHours?: { openHour: number; closeHour: number } }) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const isUserRole = (value: unknown): value is UserRole =>
    value === 'client' || value === 'barber' || value === 'admin' || value === 'owner';

  useEffect(() => {
    // Restaurar sesión desde localStorage si existe
    try {
      const token = localStorage.getItem('jwt');
      const storedUser = localStorage.getItem('auth_user');
      if (token && storedUser) {
        const parsed = JSON.parse(storedUser) as Profile;
        setUser(parsed);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user: backendUser } = res.data as { token: string; user: { id: string; name: string; email: string; role: string; barbershopId?: string | null } };
      localStorage.setItem('jwt', token);
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
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
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
      localStorage.setItem('jwt', token);
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
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
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
      localStorage.setItem('jwt', token);
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
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setUser(authUser);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
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
