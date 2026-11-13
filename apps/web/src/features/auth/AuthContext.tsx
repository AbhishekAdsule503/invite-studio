'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('invite_token');
        localStorage.removeItem('invite_refresh_token');
      }
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('invite_token');
    const refreshToken = localStorage.getItem('invite_refresh_token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      // Access token may be expired, attempt refresh
      if (refreshToken) {
        try {
          const freshTokens = await authService.refreshToken(refreshToken);
          localStorage.setItem('invite_token', freshTokens.accessToken);
          if (freshTokens.refreshToken) {
            localStorage.setItem('invite_refresh_token', freshTokens.refreshToken);
          }
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          await handleLogout();
        }
      } else {
        await handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (accessToken: string, refreshToken: string, newUser: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('invite_token', accessToken);
      localStorage.setItem('invite_refresh_token', refreshToken);
    }
    setUser(newUser);
  };

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout: handleLogout,
        refreshUser,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
