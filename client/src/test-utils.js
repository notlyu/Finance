import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

export function AllProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const customRender = (ui, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => <AllProviders>{children}</AllProviders>,
    ...options,
  });
};

function createMockAuthValue(userOverrides = {}) {
  const defaultUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    family_id: null,
  };
  const user = { ...defaultUser, ...userOverrides };
  return {
    user,
    token: 'mock-token',
    loading: false,
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  };
}

export * from '@testing-library/react';
export { customRender as render };
export { createMockAuthValue, queryClient };
