import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (login: string, pass: string) => Promise<void>;
  loginWithPin: (pin: string, userId?: number) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: Role) => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { useAuth } from './useAuth';

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

  const loginWithPin = async (pin: string, userId?: number) => {
    const res = await api.pinLogin(pin, userId);
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const quickSwitchRole = async (targetRole: Role) => {
    const pinMap: Record<Role, string> = {
      ADMIN: '1111',
      MANAGER: '2222',
      SALES_CASHIER: '3333',
      INVENTORY_CLERK: '4444',
    };

    const pin = pinMap[targetRole];
    await loginWithPin(pin);
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithPin,
        logout,
        quickSwitchRole,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


