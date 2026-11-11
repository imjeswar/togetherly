import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { CandleFlame } from './components/ui/CandleFlame';

// Pages
import { WelcomePage } from './pages/WelcomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PairingPage } from './pages/PairingPage';
import { HomePage } from './pages/HomePage';
import { ConnectPage } from './pages/ConnectPage';
import { GamesPage } from './pages/GamesPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { DateIdeasPage } from './pages/DateIdeasPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isPaired } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-togetherly-bg flex flex-col items-center justify-center space-y-4">
        <CandleFlame size="lg" showCandleBody={true} />
        <p className="text-xs text-togetherly-textMuted tracking-wider uppercase animate-pulse">
          Lighting Togetherly...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  // If authenticated but not paired yet and not already on pairing page
  if (!isPaired && window.location.pathname !== '/pair' && window.location.pathname !== '/profile') {
    return <Navigate to="/pair" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pair" element={<PairingPage />} />

            {/* Authenticated Application Space */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="connect" element={<ConnectPage />} />
              <Route path="games" element={<GamesPage />} />
              <Route path="memories" element={<MemoriesPage />} />
              <Route path="date-ideas" element={<DateIdeasPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
