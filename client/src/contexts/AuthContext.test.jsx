jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }) => children,
}));

import { render, renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

const createTestToken = (payload, expOffset = 3600) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expOffset }));
  return `${header}.${body}.signature`;
};

let store = {};
function mockStorage() {
  store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => { store[key] = value; },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] ?? null,
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  mockStorage();
});

describe('decodeToken', () => {
  it('sets user from token payload', () => {
    const payload = { id: 1, email: 'test@example.com', name: 'Test User', family_id: 5, exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = createTestToken(payload);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

    expect(result.current.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      family_id: 5,
      exp: payload.exp,
    });
  });

  it('returns null for invalid token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login('invalid-token');
    });

    expect(result.current.user).toBeNull();
  });
});

describe('AuthProvider', () => {
  it('shows loading state initially, then resolves', () => {
    const states = [];
    function TestComponent() {
      const { loading } = useAuth();
      states.push(loading);
      return null;
    }

    render(<TestComponent />, { wrapper: AuthProvider });

    expect(states.length).toBeGreaterThanOrEqual(1);
    const last = states[states.length - 1];
    expect(last).toBe(false);
  });

  it('loads user from localStorage token on mount', () => {
    const token = createTestToken({ id: 1, email: 'test@example.com', name: 'Test', family_id: 5 });
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('refreshToken', 'rt');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      family_id: 5,
      exp: expect.any(Number),
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('does not load user when no token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('does not load user when token expired', () => {
    const expiredToken = createTestToken(
      { id: 1, email: 'test@example.com', name: 'Test' },
      -3600,
    );
    window.localStorage.setItem('token', expiredToken);
    window.localStorage.setItem('refreshToken', 'rt');
    window.localStorage.setItem('refreshTokenExpiresAt', '9999999999999');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
    expect(window.localStorage.getItem('refreshTokenExpiresAt')).toBeNull();
  });
});

describe('login', () => {
  it('saves token/refreshToken to localStorage', () => {
    const token = createTestToken({ id: 1, email: 'test@example.com' });
    const refreshToken = 'refresh-token-123';
    const refreshTokenExpiresAt = '9999999999999';

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token, refreshToken, refreshTokenExpiresAt);
    });

    expect(window.localStorage.getItem('token')).toBe(token);
    expect(window.localStorage.getItem('refreshToken')).toBe(refreshToken);
    expect(window.localStorage.getItem('refreshTokenExpiresAt')).toBe(refreshTokenExpiresAt);
  });

  it('sets user state from decoded token', () => {
    const token = createTestToken({
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      family_id: 5,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

    expect(result.current.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      family_id: 5,
      exp: expect.any(Number),
    });
  });

  it('updates isAuthenticated', () => {
    const token = createTestToken({ id: 1, email: 'test@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('logout', () => {
  beforeEach(() => {
    api.post.mockClear();
    const token = createTestToken({ id: 1, email: 'test@example.com' });
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('refreshToken', 'rt');
    window.localStorage.setItem('refreshTokenExpiresAt', '9999999999999');
  });

  it('calls api.post with refreshToken', async () => {
    api.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt' });
  });

  it('clears localStorage', async () => {
    api.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
    expect(window.localStorage.getItem('refreshTokenExpiresAt')).toBeNull();
  });

  it('sets user to null', async () => {
    api.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles api error gracefully', async () => {
    api.post.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
    expect(window.localStorage.getItem('refreshTokenExpiresAt')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('useAuth', () => {
  it('returns context value when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('token');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
  });

  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
