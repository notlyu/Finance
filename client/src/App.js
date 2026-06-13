import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, lazy, Suspense } from 'react';
import { ToastContainer } from './utils/toast';
import { socketService } from './services/socket';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingModal from './components/OnboardingModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

const DashboardWithWidgets = lazy(() => import('./pages/DashboardWithWidgets'));
const Transactions = lazy(() => import('./pages/Transactions'));
const GoalsWishes = lazy(() => import('./pages/GoalsWishes'));
const SafetyPillow = lazy(() => import('./pages/SafetyPillow'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Family = lazy(() => import('./pages/Family'));
const Settings = lazy(() => import('./pages/Settings'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Debts = lazy(() => import('./pages/Debts'));
const Import = lazy(() => import('./pages/Import'));
const Export = lazy(() => import('./pages/Export'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

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
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Управляет realtime-соединением: подключает сокет при аутентификации (cookie-сессия),
// инвалидирует кэш на family_update (#9). Живёт внутри AuthProvider (нужен useAuth).
function RealtimeBridge() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
    return () => socketService.disconnect();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleFamilyUpdate = () => queryClient.invalidateQueries();
    socketService.on('family_update', handleFamilyUpdate);
    return () => socketService.off('family_update', handleFamilyUpdate);
  }, []);

  return null;
}

// AppRoutes живёт внутри BrowserRouter, поэтому может использовать useLocation
function AppRoutes() {
  const [currentSpace, setCurrentSpace] = useState(
    () => localStorage.getItem('currentSpace') || 'personal'
  );
  const location = useLocation();

  // Синхронизируем currentSpace с реальным URL (TZ_v3 §13)
  useEffect(() => {
    if (location.pathname.startsWith('/family')) {
      setCurrentSpace('family');
      localStorage.setItem('currentSpace', 'family');
    } else if (location.pathname.startsWith('/personal')) {
      setCurrentSpace('personal');
      localStorage.setItem('currentSpace', 'personal');
    }
  }, [location.pathname]);

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

  return (
    <AuthProvider>
      <RealtimeBridge />
      <ErrorBoundary>
        <ToastContainer />
        <OnboardingModal />
        <UnsavedChangesProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth routes */}
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

            <Route path="/" element={<Navigate to="/personal/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </UnsavedChangesProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
