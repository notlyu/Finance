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
  jest.clearAllMocks();
});

describe('decodeToken', () => {
  it('sets user from token payload', () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

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
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login('invalid-token');
    });

    expect(result.current.user).toBeNull();
  });
});

describe('AuthProvider', () => {
  it('shows loading state initially, then resolves', async () => {
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

  it('loads user from /api/auth/me on mount', async () => {
    const userData = { id: 1, email: 'test@example.com', name: 'Test' };
    axios.get.mockResolvedValue({ data: userData });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(userData);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refreshes token when /api/auth/me fails', async () => {
    const token = createTestToken({ id: 1, email: 'test@example.com', name: 'Test', family_id: 5 });
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockResolvedValue({ data: { token } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      family_id: 5,
      exp: expect.any(Number),
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('does not load user when not authenticated', async () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('login', () => {
  it('sets user state from decoded token', () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

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
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const token = createTestToken({ id: 1, email: 'test@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('saves token via setAccessToken', () => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));

    const token = createTestToken({ id: 1, email: 'test@example.com' });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

    const { getAccessToken } = require('../services/api');
    expect(getAccessToken()).toBe(token);
  });
});

describe('logout', () => {
  beforeEach(() => {
    axios.get.mockRejectedValue(new Error('no session'));
    axios.post.mockRejectedValue(new Error('no refresh'));
    api.post = jest.fn().mockResolvedValue({ data: {} });
  });

  it('calls api.post /auth/logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('sets user to null and clears isAuthenticated', async () => {
    const token = createTestToken({ id: 1, email: 'test@example.com' });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => {
      result.current.login(token);
    });

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

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears in-memory access token', async () => {
    const { getAccessToken, setAccessToken } = require('../services/api');
    setAccessToken('old-token');

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.logout();
    });

    expect(getAccessToken()).toBeNull();
  });
});

describe('useAuth', () => {
  it('returns context value when used within AuthProvider', async () => {
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

  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
