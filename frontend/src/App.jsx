import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { PWAProvider } from './contexts/PWAContext';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// ── Eager (tiny, needed immediately) ─────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Auth
const ForgotPasswordPage    = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage     = lazy(() => import('./pages/ResetPasswordPage'));

// Public marketing
const HomePage              = lazy(() => import('./pages/public/HomePage'));
const PricingPage           = lazy(() => import('./pages/public/PricingPage'));
const SignupPage             = lazy(() => import('./pages/public/SignupPage'));
const SignupSuccessPage      = lazy(() => import('./pages/public/SignupSuccessPage'));
const SelfHostedPurchasePage    = lazy(() => import('./pages/public/SelfHostedPurchasePage'));
const BuildertrendMigrationPage = lazy(() => import('./pages/public/BuildertrendMigrationPage'));
const AgencyProgramPage         = lazy(() => import('./pages/public/AgencyProgramPage'));
const TermsPage                 = lazy(() => import('./pages/TermsPage'));
const PrivacyPage               = lazy(() => import('./pages/PrivacyPage'));

// Customer portal
const PortalLayout              = lazy(() => import('./components/portal/PortalLayout'));
const PortalDashboard           = lazy(() => import('./components/portal/PortalDashboard'));
const PortalInvoices            = lazy(() => import('./components/portal/PortalInvoices'));
const PortalQuotes              = lazy(() => import('./components/portal/PortalQuotes'));
const PortalChangeOrders        = lazy(() => import('./components/portal/PortalChangeOrders'));
const PortalProjects            = lazy(() => import('./components/portal/PortalProjects'));

// Operator
const OperatorLayout        = lazy(() => import('./components/layout/OperatorLayout'));
const OperatorDashboard     = lazy(() => import('./pages/OperatorDashboard'));
const CustomersPage         = lazy(() => import('./pages/CustomersPage'));
const PlansPage              = lazy(() => import('./pages/PlansPage'));
const CustomerDetailPage    = lazy(() => import('./pages/CustomerDetailPage'));
const SettingsPage          = lazy(() => import('./pages/SettingsPage'));
const BillingSettingsPage   = lazy(() => import('./pages/settings/BillingSettingsPage'));
const IntegrationsPage      = lazy(() => import('./pages/settings/IntegrationsPage'));
const FactoryWizard         = lazy(() => import('./components/builder/FactoryWizard'));
const BuildsPage            = lazy(() => import('./pages/BuildsPage'));

// CRM demo — core
const AppLayout             = lazy(() => import('./components/layout/AppLayout'));
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const ContactsPage          = lazy(() => import('./pages/ContactsPage'));
const ContactDetailPage     = lazy(() => import('./components/detail/ContactDetailPage'));
const ProjectsPage          = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage     = lazy(() => import('./components/detail/ProjectDetailPage'));
const JobsPage              = lazy(() => import('./pages/JobsPage'));
const JobDetailPage         = lazy(() => import('./components/detail/JobDetailPage'));
const QuotesPage            = lazy(() => import('./pages/QuotesPage'));
const QuoteDetailPage       = lazy(() => import('./components/detail/QuoteDetailPage'));
const InvoicesPage          = lazy(() => import('./pages/InvoicesPage'));
const InvoiceDetailPage     = lazy(() => import('./components/detail/InvoiceDetailPage'));
const SchedulePage          = lazy(() => import('./pages/SchedulePage'));
const TimePage              = lazy(() => import('./pages/TimePage'));
const ExpensesPage          = lazy(() => import('./pages/ExpensesPage'));
const DocumentsPage         = lazy(() => import('./pages/DocumentsPage'));
const TeamPage              = lazy(() => import('./pages/TeamPage'));

// CRM demo — construction
const RFIsPage              = lazy(() => import('./pages/RFIsPage'));
const ChangeOrdersPage      = lazy(() => import('./pages/ChangeOrdersPage'));
const PunchListsPage        = lazy(() => import('./pages/PunchListsPage'));
const DailyLogsPage         = lazy(() => import('./pages/DailyLogsPage'));
const InspectionsPage       = lazy(() => import('./pages/InspectionsPage'));
const BidsPage              = lazy(() => import('./pages/BidsPage'));

// CRM demo — premium features (biggest chunks, loaded only when navigated to)
const FleetPage             = lazy(() => import('./pages/fleet/FleetPage'));
const InventoryPage         = lazy(() => import('./pages/inventory/InventoryPage'));
const EquipmentPage         = lazy(() => import('./pages/equipment/EquipmentPage'));
const MarketingPage         = lazy(() => import('./pages/marketing/MarketingPage'));
const PricebookPage         = lazy(() => import('./pages/pricebook/PricebookPage'));
const AgreementsPage        = lazy(() => import('./pages/agreements/AgreementsPage'));
const WarrantiesPage        = lazy(() => import('./pages/warranties/WarrantiesPage'));
const CallTrackingPage      = lazy(() => import('./pages/calltracking/CallTrackingPage'));
const RecurringListPage     = lazy(() => import('./pages/recurring').then(m => ({ default: m.RecurringList })));
const TakeoffsPage          = lazy(() => import('./pages/takeoffs/TakeoffsPage'));
const TasksPage             = lazy(() => import('./pages/tasks/TasksPage'));
const MessagesPage          = lazy(() => import('./pages/messages/MessagesPage'));
const ReportsDashboard      = lazy(() => import('./pages/reports/ReportsDashboard'));
const SelectionsPage        = lazy(() => import('./pages/selections/SelectionsPage'));
const AuditPage             = lazy(() => import('./pages/AuditPage'));
const RecycleBinPage        = lazy(() => import('./pages/RecycleBinPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg, #f8fafc)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PermissionsProvider>
            <ToastProvider>
              <PWAProvider>
              <SocketProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public marketing */}
                    <Route path="/pricing"        element={<PricingPage />} />
                    <Route path="/signup"         element={<SignupPage />} />
                    <Route path="/signup/success" element={<SignupSuccessPage />} />
                    <Route path="/self-hosted"    element={<SelfHostedPurchasePage />} />
                    <Route path="/migrate-from-buildertrend" element={<BuildertrendMigrationPage />} />
                    <Route path="/agency"         element={<AgencyProgramPage />} />
                    <Route path="/home"           element={<HomePage />} />
                    <Route path="/terms"          element={<TermsPage />} />
                    <Route path="/privacy"        element={<PrivacyPage />} />

                    {/* ── CUSTOMER PORTAL ── */}
                    <Route path="/portal/:token" element={<PortalLayout />}>
                      <Route index                     element={<PortalDashboard />} />
                      <Route path="invoices"           element={<PortalInvoices />} />
                      <Route path="quotes"             element={<PortalQuotes />} />
                      <Route path="change-orders"      element={<PortalChangeOrders />} />
                      <Route path="projects"           element={<PortalProjects />} />
                    </Route>

                    {/* Auth */}
                    <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
                    <Route path="/register"       element={<PublicRoute><RegisterPage /></PublicRoute>} />
                    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                    <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

                    {/* ── OPERATOR DASHBOARD ── */}
                    <Route path="/" element={<ProtectedRoute><OperatorLayout /></ProtectedRoute>}>
                      <Route index                        element={<OperatorDashboard />} />
                      <Route path="customers"            element={<CustomersPage />} />
                      <Route path="customers/:id"        element={<CustomerDetailPage />} />
                      <Route path="factory"              element={<FactoryWizard />} />
                      <Route path="plans"               element={<PlansPage />} />
                      <Route path="builds"               element={<BuildsPage />} />
                      <Route path="settings"             element={<SettingsPage />} />
                      <Route path="settings/billing"     element={<BillingSettingsPage />} />
                      <Route path="settings/integrations" element={<IntegrationsPage />} />
                    </Route>

                    {/* ── CRM DEMO ── */}
                    <Route path="/demo" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                      <Route index                   element={<DashboardPage />} />
                      <Route path="contacts"         element={<ContactsPage />} />
                      <Route path="contacts/:id"     element={<ContactDetailPage />} />
                      <Route path="projects"         element={<ProjectsPage />} />
                      <Route path="projects/:id"     element={<ProjectDetailPage />} />
                      <Route path="jobs"             element={<JobsPage />} />
                      <Route path="jobs/:id"         element={<JobDetailPage />} />
                      <Route path="quotes"           element={<QuotesPage />} />
                      <Route path="quotes/:id"       element={<QuoteDetailPage />} />
                      <Route path="invoices"         element={<InvoicesPage />} />
                      <Route path="invoices/:id"     element={<InvoiceDetailPage />} />
                      <Route path="schedule"         element={<SchedulePage />} />
                      <Route path="time"             element={<TimePage />} />
                      <Route path="expenses"         element={<ExpensesPage />} />
                      <Route path="documents"        element={<DocumentsPage />} />
                      <Route path="team"             element={<TeamPage />} />
                      <Route path="rfis"             element={<RFIsPage />} />
                      <Route path="change-orders"    element={<ChangeOrdersPage />} />
                      <Route path="punch-lists"      element={<PunchListsPage />} />
                      <Route path="daily-logs"       element={<DailyLogsPage />} />
                      <Route path="inspections"      element={<InspectionsPage />} />
                      <Route path="bids"             element={<BidsPage />} />
                      <Route path="fleet"            element={<FleetPage />} />
                      <Route path="inventory"        element={<InventoryPage />} />
                      <Route path="equipment"        element={<EquipmentPage />} />
                      <Route path="marketing"        element={<MarketingPage />} />
                      <Route path="pricebook"        element={<PricebookPage />} />
                      <Route path="agreements"       element={<AgreementsPage />} />
                      <Route path="warranties"       element={<WarrantiesPage />} />
                      <Route path="call-tracking"    element={<CallTrackingPage />} />
                      <Route path="recurring"        element={<RecurringListPage />} />
                      <Route path="takeoffs"         element={<TakeoffsPage />} />
                      <Route path="tasks"            element={<TasksPage />} />
                      <Route path="messages"         element={<MessagesPage />} />
                      <Route path="reports"          element={<ReportsDashboard />} />
                      <Route path="selections"       element={<SelectionsPage />} />
                      <Route path="audit"            element={<AuditPage />} />
                      <Route path="recycle-bin"     element={<RecycleBinPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </SocketProvider>
              </PWAProvider>
            </ToastProvider>
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
