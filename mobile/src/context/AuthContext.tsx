import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { secureStorage } from '../services/secureStore';
import { biometricService } from '../services/biometric';
import { e2eeService } from '../services/e2ee';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isBiometricLocked: boolean;
  requires2FA: boolean;
  tempToken: string | null;
  login: (credentials: { email: string; password?: string }) => Promise<{ requires2FA?: boolean }>;
  verify2FA: (code: string) => Promise<boolean>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  unlockBiometric: (pin?: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(false);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      const savedToken = await secureStorage.getAuthToken();
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      setToken(savedToken);

      // Check biometric preference
      const isBioEnabled = await secureStorage.getBiometricEnabled();
      if (isBioEnabled) {
        setIsBiometricLocked(true);
      }

      // Fetch user profile
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
        await initE2EEAndSession(res.user);
      }
    } catch {
      await secureStorage.clearAuthToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const initE2EEAndSession = async (currUser: User) => {
    try {
      // 1. Initialize E2EE Keypair and register public key
      const keyPair = await e2eeService.getOrCreateKeyPair();
      await api.uploadE2EEPublicKey(keyPair.publicKey).catch(() => {});

      // 2. Ping device session
      await api.pingSession().catch(() => {});

      // 3. Connect real-time socket
      if (currUser.relationshipId) {
        await socketService.connect(currUser.relationshipId);
      }
    } catch {}
  };

  const login = async (credentials: { email: string; password?: string }) => {
    const res = await api.login(credentials);

    if (res.requires2FA) {
      setRequires2FA(true);
      setTempToken(res.tempToken);
      return { requires2FA: true };
    }

    if (res.token && res.user) {
      await secureStorage.setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      await initE2EEAndSession(res.user);
      return { requires2FA: false };
    }

    throw new Error(res.error || 'Login failed');
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    if (!tempToken) throw new Error('No pending 2FA login session');

    const res = await api.verify2FALogin(tempToken, code);
    if (res.token && res.user) {
      await secureStorage.setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setRequires2FA(false);
      setTempToken(null);
      await initE2EEAndSession(res.user);
      return true;
    }
    return false;
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.token && res.user) {
      await secureStorage.setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      await initE2EEAndSession(res.user);
    } else {
      throw new Error(res.error || 'Registration failed');
    }
  };

  const logout = async () => {
    socketService.disconnect();
    await secureStorage.clearAll();
    setUser(null);
    setToken(null);
    setIsBiometricLocked(false);
    setRequires2FA(false);
    setTempToken(null);
  };

  const unlockBiometric = async (pin?: string): Promise<boolean> => {
    if (pin) {
      const valid = await biometricService.verifyPin(pin);
      if (valid) {
        setIsBiometricLocked(false);
        return true;
      }
      return false;
    }

    const success = await biometricService.authenticate();
    if (success) {
      setIsBiometricLocked(false);
      return true;
    }
    return false;
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isBiometricLocked,
        requires2FA,
        tempToken,
        login,
        verify2FA,
        register,
        logout,
        unlockBiometric,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

