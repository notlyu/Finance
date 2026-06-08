import '@testing-library/jest-dom';
import React from 'react';

jest.mock('axios');

jest.mock('react-router-dom', () => {
  const m = {
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    NavLink: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    Outlet: () => <div data-testid="outlet" />,
    BrowserRouter: ({ children }) => <>{children}</>,
    MemoryRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: () => null,
    matchPath: jest.fn(),
    matchRoutes: jest.fn(),
    createPath: jest.fn(),
    generatePath: jest.fn(),
    resolvePath: jest.fn(),
    useHref: jest.fn(),
    useMatch: jest.fn(),
    useResolvedPath: jest.fn(),
    useRouteError: jest.fn(),
  };
  return m;
});

jest.mock('./utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockSocket = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

jest.mock('./services/socket', () => ({
  __esModule: true,
  default: mockSocket,
  socketService: mockSocket,
}));

jest.mock('react-dom', () => {
  const actual = jest.requireActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node,
  };
});

let store = {};
const mockLocalStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { store = {}; },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

window.matchMedia = window.matchMedia || function matchMediaMock(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {},
  };
};

window.scrollTo = function() {};
window.URL.createObjectURL = function() { return 'blob:test'; };
window.URL.revokeObjectURL = function() {};

beforeEach(() => {
  store = {};
});
