jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => children,
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

import { render, renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';
import axios from 'axios';

beforeEach(() => {
  jest.clearAllMocks();
});

// Cookie-only: пользователь определяется по /me, токена в JS нет.

describe('AuthProvider init', () => {
  it('shows loading initially, then resolves', async () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const states = [];
    function TestComponent() {
      const { loading } = useAuth();
      states.push(loading);
      return null;
    }

    render(<TestComponent />, { wrapper: AuthProvider });

    expect(states[0]).toBe(true);
    await waitFor(() => expect(states[states.length - 1]).toBe(false));
  });

  it('loads user from /me on mount', async () => {
    const userData = { id: 1, email: 'test@example.com', name: 'Test', family_id: 5 };
    axios.get.mockResolvedValue({ data: userData });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refreshes then re-fetches /me when first /me fails', async () => {
    const userData = { id: 1, email: 'test@example.com', name: 'Test', family_id: 5 };
    // первый /me падает, refresh ок, второй /me возвращает пользователя
    axios.get.mockRejectedValueOnce(new Error('no session')).mockResolvedValueOnce({ data: userData });
    axios.post.mockResolvedValue({ data: { ok: true } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('stays unauthenticated when /me and refresh both fail', async () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('login()', () => {
  it('fetches /me and sets the user (no token in JS)', async () => {
    const userData = { id: 7, email: 'a@b.com', name: 'A', family_id: null };
    // init: нет сессии
    axios.get.mockRejectedValueOnce(new Error('no session'));
    axios.post.mockRejectedValueOnce(new Error('no refresh'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // после успешного логина (cookie выставлена сервером) login() тянет /me
    axios.get.mockResolvedValueOnce({ data: userData });
    await act(async () => {
      await result.current.login();
    });

    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('logout()', () => {
  beforeEach(() => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));
    api.post = jest.fn().mockResolvedValue({ data: {} });
  });

  it('calls api.post /auth/logout and clears the user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears the user even if logout request fails', async () => {
    api.post.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('useAuth', () => {
  it('returns context value within AuthProvider', async () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
