import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';

// Layout & Auth
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Admin Pages
import DashboardPage from './pages/DashboardPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';
import CaregiversPage from './pages/CaregiversPage.jsx';
import CaregiverDetailPage from './pages/CaregiverDetailPage.jsx';
import SchedulingPage from './pages/SchedulingPage.jsx';
import TimeTrackingPage from './pages/TimeTrackingPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import CompliancePage from './pages/CompliancePage.jsx';
import CommunicationPage from './pages/CommunicationPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import EVVPage from './pages/EVVPage.jsx';
import ClaimsPage from './pages/ClaimsPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';

// Caregiver portal
import CaregiverPortalPage from './pages/CaregiverPortalPage.jsx';

// Family portal
import FamilyPortalPage from './pages/FamilyPortalPage.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" style={{ borderColor: 'var(--color-primary)' }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role === 'caregiver') return <Navigate to="/caregiver" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'caregiver' ? '/caregiver' : '/'} replace /> : <LoginPage />} />
      <Route path="/portal" element={<FamilyPortalPage />} />

      {/* Admin routes */}
      <Route path="/" element={<ProtectedRoute adminOnly><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="caregivers" element={<CaregiversPage />} />
        <Route path="caregivers/:id" element={<CaregiverDetailPage />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="time-tracking" element={<TimeTrackingPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="communication" element={<CommunicationPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="evv" element={<EVVPage />} />
        <Route path="claims" element={<ClaimsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Caregiver dashboard */}
      <Route path="/caregiver/*" element={<ProtectedRoute><CaregiverPortalPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
