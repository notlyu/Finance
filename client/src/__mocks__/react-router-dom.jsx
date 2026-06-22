import React from 'react';

const mockNavigate = jest.fn();
const mockParams = {};
const mockLocation = { pathname: '/', search: '', hash: '' };

export const useNavigate = jest.fn(() => mockNavigate);
export const useParams = jest.fn(() => mockParams);
export const useLocation = jest.fn(() => mockLocation);
export const Navigate = ({ to }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to });
export const Link = ({ children, to, ...props }) => React.createElement('a', { href: to, ...props, 'data-testid': 'link' }, children);
export const NavLink = ({ children, to, ...props }) => React.createElement('a', { href: to, ...props, 'data-testid': 'navlink' }, children);
export const Outlet = () => React.createElement('div', { 'data-testid': 'outlet' });
export const BrowserRouter = ({ children }) => React.createElement(React.Fragment, null, children);
export const MemoryRouter = ({ children }) => React.createElement(React.Fragment, null, children);
export const Routes = ({ children }) => React.createElement(React.Fragment, null, children);
export const Route = () => React.createElement(React.Fragment, null);
export { mockNavigate, mockParams, mockLocation };
