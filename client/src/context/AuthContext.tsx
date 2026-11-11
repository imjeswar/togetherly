import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Partner, Relationship } from '../types';
import { api } from '../services/api';
import { joinRelationshipRoom } from '../services/socket';

interface AuthContextType {
  user: User | null;
  partner: Partner | null;
  relationship: Relationship | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPaired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  quickLogin: (userType: 'alex' | 'sarah') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.auth.getMe();
      if (data?.user) {
        setUser(data.user);
        setRelationship(data.user.relationship || null);
        setPartner(data.user.partner || null);

        if (data.user.relationshipId) {
          joinRelationshipRoom(data.user.relationshipId, data.user.id);
        }
      } else {
        setUser(null);
        setPartner(null);
        setRelationship(null);
      }
    } catch (err) {
      setUser(null);
      setPartner(null);
      setRelationship(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    if (data.token) {
      localStorage.setItem('togetherly_token', data.token);
    }
    setUser(data.user);
    setRelationship(data.user.relationship || null);
    setPartner(data.user.partner || null);

    if (data.user.relationshipId) {
      joinRelationshipRoom(data.user.relationshipId, data.user.id);
    }
  };

  const register = async (formData: any) => {
    const data = await api.auth.register(formData);
    if (data.token) {
      localStorage.setItem('togetherly_token', data.token);
    }
    setUser(data.user);
    setRelationship(null);
    setPartner(null);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('togetherly_token');
    setUser(null);
    setPartner(null);
    setRelationship(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const quickLogin = async (userType: 'alex' | 'sarah') => {
    const email = userType === 'alex' ? 'alex@togetherly.app' : 'sarah@togetherly.app';
    await login(email, 'password123');
  };

  const isAuthenticated = Boolean(user);
  const isPaired = Boolean(relationship && partner);

  return (
    <AuthContext.Provider
      value={{
        user,
        partner,
        relationship,
        isLoading,
        isAuthenticated,
        isPaired,
        login,
        register,
        logout,
        refreshUser,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
