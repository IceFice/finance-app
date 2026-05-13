import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Suspense, lazy, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastProvider, useToast, extractApiError } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const LandingPage      = lazy(() => import('@/pages/Landing'));
const LoginPage        = lazy(() => import('@/pages/Login'));
const RegisterPage     = lazy(() => import('@/pages/Register'));
const DashboardPage    = lazy(() => import('@/pages/Dashboard'));
const TransactionsPage = lazy(() => import('@/pages/Transactions'));
const BudgetsPage      = lazy(() => import('@/pages/Budgets'));
const ReportsPage      = lazy(() => import('@/pages/Reports'));

function PageFallback() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout><Outlet /></AppLayout>;
}

function AppRoutes() {
  const { showError } = useToast();

  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          showError(extractApiError(error));
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 300_000,
          retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 401 || status === 403 || status === 404) return false;
            return failureCount < 2;
          },
          refetchOnWindowFocus: false,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Публичные маршруты ── */}
            <Route path="/" element={
              <Suspense fallback={<PageFallback />}><LandingPage /></Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<PageFallback />}><LoginPage /></Suspense>
            } />
            <Route path="/register" element={
              <Suspense fallback={<PageFallback />}><RegisterPage /></Suspense>
            } />

            {/* ── Защищённые маршруты ── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={
                <ErrorBoundary><Suspense fallback={<PageFallback />}><DashboardPage /></Suspense></ErrorBoundary>
              } />
              <Route path="/transactions" element={
                <ErrorBoundary><Suspense fallback={<PageFallback />}><TransactionsPage /></Suspense></ErrorBoundary>
              } />
              <Route path="/budgets" element={
                <ErrorBoundary><Suspense fallback={<PageFallback />}><BudgetsPage /></Suspense></ErrorBoundary>
              } />
              <Route path="/reports" element={
                <ErrorBoundary><Suspense fallback={<PageFallback />}><ReportsPage /></Suspense></ErrorBoundary>
              } />
            </Route>

            {/* ── 404 → главная ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
