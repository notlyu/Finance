import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ToastContainer } from './utils/toast';
import { socketService } from './services/socket';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingModal from './components/OnboardingModal';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import DashboardWithWidgets from './pages/DashboardWithWidgets';
import Transactions from './pages/Transactions';
import GoalsWishes from './pages/GoalsWishes';
import SafetyPillow from './pages/SafetyPillow';
import Layout from './components/Layout';
import Analytics from './pages/Analytics';
import Family from './pages/Family';
import Settings from './pages/Settings';
import Budgets from './pages/Budgets';
import Recurring from './pages/Recurring';
import Debts from './pages/Debts';
import Import from './pages/Import';
import Export from './pages/Export';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [currentSpace, setCurrentSpace] = useState('personal');
  
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect();
    }
    return () => socketService.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ToastContainer />
          <OnboardingModal />
          <Routes>
            {/* Auth routes - no space */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            
            {/* Personal Space */}
            <Route path="/personal" element={<PrivateRoute><Layout space="personal" currentSpace={currentSpace} onSpaceChange={setCurrentSpace} /></PrivateRoute>}>
              <Route index element={<Navigate to="/personal/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardWithWidgets space="personal" />} />
              <Route path="transactions" element={<Transactions space="personal" />} />
              <Route path="goals" element={<GoalsWishes space="personal" />} />
              <Route path="safety-pillow" element={<SafetyPillow space="personal" />} />
              <Route path="analytics" element={<Analytics space="personal" />} />
              <Route path="budgets" element={<Budgets space="personal" />} />
              <Route path="recurring" element={<Recurring space="personal" />} />
              <Route path="debts" element={<Debts space="personal" />} />
              <Route path="import" element={<Import />} />
              <Route path="export" element={<Export space="personal" />} />
              <Route path="settings" element={<Settings />} />
             </Route>

            {/* Family Space */}
            <Route path="/family" element={<PrivateRoute><Layout space="family" currentSpace={currentSpace} onSpaceChange={setCurrentSpace} /></PrivateRoute>}>
              <Route index element={<Navigate to="/family/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardWithWidgets space="family" />} />
              <Route path="transactions" element={<Transactions space="family" />} />
              <Route path="goals" element={<GoalsWishes space="family" />} />
              <Route path="safety-pillow" element={<SafetyPillow space="family" />} />
              <Route path="analytics" element={<Analytics space="family" />} />
              <Route path="budgets" element={<Budgets space="family" />} />
              <Route path="recurring" element={<Recurring space="family" />} />
              <Route path="debts" element={<Debts space="family" />} />
              <Route path="import" element={<Import />} />
              <Route path="export" element={<Export space="family" />} />
              <Route path="manage" element={<Family />} />
              <Route path="settings" element={<Settings />} />
             </Route>

            {/* Legacy routes redirect to personal */}
            <Route path="/" element={<Navigate to="/personal/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/personal/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;