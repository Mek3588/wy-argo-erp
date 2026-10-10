import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, StaffMember } from '../types';
import { api, initApiClient, getServerUrl, setServerUrl, setAuthToken } from '../api/client';

const STORAGE_KEY_USER = '@wy_argo_user';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  serverUrl: string;
  isConnected: boolean;
  staffList: StaffMember[];
  loginWithPin: (pin: string, userId?: number) => Promise<void>;
  logout: () => Promise<void>;
  refreshStaffList: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrlState, setServerUrlState] = useState<string>(getServerUrl());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const checkConnection = async (): Promise<boolean> => {
    try {
      await api.checkHealth();
      setIsConnected(true);
      return true;
    } catch (e) {
      setIsConnected(false);
      return false;
    }
  };

  const refreshStaffList = async () => {
    try {
      const staff = await api.getStaffList();
      setStaffList(staff);
      setIsConnected(true);
    } catch (e) {
      console.warn('Failed to load staff list:', e);
      setIsConnected(false);
    }
  };

  const updateServerUrl = async (newUrl: string): Promise<boolean> => {
    try {
      await setServerUrl(newUrl);
      setServerUrlState(getServerUrl());
      const ok = await checkConnection();
      if (ok) {
        await refreshStaffList();
      }
      return ok;
    } catch {
      return false;
    }
  };

  // Initialize on boot
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const url = await initApiClient();
        setServerUrlState(url);

        // Check connection & load staff
        const ok = await checkConnection();
        if (ok) {
          try {
            const staff = await api.getStaffList();
            setStaffList(staff);
          } catch (e) {
            console.warn('Could not fetch staff during bootstrap', e);
          }
        }

        // Check saved session
        const savedToken = await AsyncStorage.getItem('@wy_argo_auth_token');
        const savedUserStr = await AsyncStorage.getItem(STORAGE_KEY_USER);
        if (savedToken && savedUserStr) {
          await setAuthToken(savedToken);
          setToken(savedToken);
          setUser(JSON.parse(savedUserStr));
        } else {
          await setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const loginWithPin = async (pin: string, userId?: number) => {
    setIsLoading(true);
    try {
      const res = await api.loginWithPin(pin, userId);
      // Guarantee token is available in api client BEFORE updating user state
      await setAuthToken(res.token);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await setAuthToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        serverUrl: serverUrlState,
        isConnected,
        staffList,
        loginWithPin,
        logout,
        refreshStaffList,
        updateServerUrl,
        checkConnection,
      }}
    >
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

