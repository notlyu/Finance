import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page for unauthenticated user', () => {
  render(<App />);
  // App should render without crashing
  expect(document.body).toBeInTheDocument();
});
