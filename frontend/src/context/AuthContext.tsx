import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (login: string, pass: string) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: Role) => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then((res) => setUser(res.user))
        .catch(() => {
          removeAuthToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (loginStr: string, pass: string) => {
    const res = await api.login(loginStr, pass);
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const quickSwitchRole = async (targetRole: Role) => {
    const credentials: Record<Role, { login: string; pass: string }> = {
      ADMIN: { login: 'admin@wyargo.com', pass: 'admin123' },
      MANAGER: { login: 'manager@wyargo.com', pass: 'manager123' },
      SALES_CASHIER: { login: 'cashier@wyargo.com', pass: 'cashier123' },
      INVENTORY_CLERK: { login: 'inventory@wyargo.com', pass: 'inventory123' },
    };

    const cred = credentials[targetRole];
    await login(cred.login, cred.pass);
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, quickSwitchRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
