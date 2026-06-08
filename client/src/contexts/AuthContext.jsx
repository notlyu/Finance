import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api, { setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || payload.email?.split('@')[0],
      family_id: payload.family_id || null,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get('/api/auth/me', { withCredentials: true });
        setUser(res.data);
      } catch {
        // Not authenticated via cookie, try refreshing
        try {
          const refreshRes = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
          if (refreshRes.data?.token) {
            setAccessToken(refreshRes.data.token);
            const decoded = decodeToken(refreshRes.data.token);
            setUser(decoded);
          }
        } catch {
          clearAccessToken();
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  const login = useCallback((token, refreshToken, refreshTokenExpiresAt) => {
    setAccessToken(token);
    const decoded = decodeToken(token);
    setUser(decoded);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
