import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { api } from './lib/api';

// Pages
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import DefenseDetail from './pages/DefenseDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Defenses from './pages/Defenses';
import Consultations from './pages/Consultations';
import ConsultationDetail from './pages/ConsultationDetail';
import Reports from './pages/Reports';
import Panelists from './pages/Panelists';
import StudentView from './pages/StudentView';
import AccountSettings from './pages/AccountSettings';

function ProtectedRoute({ children, user, loading }: { children: React.ReactNode, user: any, loading: boolean }) {
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.auth.me()
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/overview" replace /> : <Login onLogin={(u: any) => setUser(u)} />}
        />
        <Route path="/student" element={<StudentView />} />
        
        {/* Admin Routes */}
        <Route path="/" element={
          <ProtectedRoute user={user} loading={loading}>
            <Layout user={user} onLogout={() => setUser(null)} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:teamId" element={<TeamDetail />} />
          <Route path="teams/:teamId/defenses/:defenseId" element={<DefenseDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="defenses" element={<Defenses />} />
          <Route path="defenses/:defenseId" element={<DefenseDetail />} />
          <Route path="consultations" element={<Consultations />} />
          <Route path="consultations/:consultationId" element={<ConsultationDetail />} />
          <Route path="panelists" element={<Panelists />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
