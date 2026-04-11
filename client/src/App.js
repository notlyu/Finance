import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Wishes from './pages/Wishes';
import SafetyPillow from './pages/SafetyPillow';
import Layout from './components/Layout';
import Analytics from './pages/Analytics';
import Family from './pages/Family';
import Settings from './pages/Settings';
import Budgets from './pages/Budgets';
import Recurring from './pages/Recurring';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="goals" element={<Goals />} />
            <Route path="wishes" element={<Wishes />} />
            <Route path="safety-pillow" element={<SafetyPillow />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="family" element={<Family />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;