import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, authToken } from '../services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Single shared session for the whole app (member/barista/admin surfaces
// alike) - signing in once in any one gate carries over everywhere else,
// replacing what used to be five separate self-contained login forms each
// re-deriving their own session from the same JWT in localStorage.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!authToken.get()) {
        setIsLoading(false);
        return;
      }
      const result = await api.getCurrentUser();
      if (result.success) {
        setUser(result.data);
      } else {
        authToken.clear();
      }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await api.login(email, password);
    if (!result.success) return { success: false, error: result.error };
    setUser(result.data.user);
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const result = await api.register(name, email, password);
    if (!result.success) return { success: false, error: result.error };
    setUser(result.data.user);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    authToken.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
