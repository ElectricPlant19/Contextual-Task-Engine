import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage, DashboardPage, TasksPage } from './pages';
import { InsightsPage } from './pages/InsightsPage';
import { KanbanPage } from './pages/KanbanPage';
import './index.css';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-void)',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{
        width: '36px', height: '36px',
        borderRadius: '9px',
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(212,168,83,0.25)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 700, color: '#0a0704', fontSize: '1rem' }}>C</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
        Loading
      </p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/tasks"    element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/board"    element={<ProtectedRoute><KanbanPage /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
