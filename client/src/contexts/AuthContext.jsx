import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api, { API_BASE } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Пользователь определяется по cookie-сессии через /me (токена в JS нет).
  // Используем raw axios (мимо интерсептора api), чтобы init сам обрабатывал 401.
  const fetchMe = useCallback(async () => {
    const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
    setUser(res.data);
    return res.data;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchMe();
      } catch {
        // Нет валидной cookie-сессии — пробуем refresh (cookie), затем снова /me.
        try {
          await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
          await fetchMe();
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    };

    init();
  }, [fetchMe]);

  // Вызывается после успешного login/register (сервер уже выставил cookie-сессию).
  const login = useCallback(async () => fetchMe(), [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* игнорируем — cookie всё равно чистятся сервером */
    }
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
