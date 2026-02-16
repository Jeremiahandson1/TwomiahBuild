import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Home, Users, FolderKanban, Briefcase, FileText, Receipt, 
  Calendar, Clock, DollarSign, FileQuestion, ClipboardList, CheckSquare,
  BookOpen, ClipboardCheck, Target, Settings, LogOut, Bell, Search,
  ChevronDown, Building, User, FolderOpen, Package, Truck, Warehouse,
  Wrench, Megaphone, CreditCard, Repeat, Scissors, ListTodo,
  MessageSquare, BarChart3, Star, ShieldCheck, Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { SkipLink, RouteAnnouncer } from '../common/Accessibility';
import { useIsMobile } from '../../hooks/useMediaQuery';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', exact: true },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/quotes', icon: FileText, label: 'Quotes' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/time', icon: Clock, label: 'Time' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/rfis', icon: FileQuestion, label: 'RFIs' },
  { to: '/change-orders', icon: ClipboardList, label: 'Change Orders' },
  { to: '/punch-lists', icon: CheckSquare, label: 'Punch Lists' },
  { to: '/daily-logs', icon: BookOpen, label: 'Daily Logs' },
  { to: '/inspections', icon: ClipboardCheck, label: 'Inspections' },
  { to: '/bids', icon: Target, label: 'Bids' },
  { to: '/fleet', icon: Truck, label: 'Fleet' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/equipment', icon: Wrench, label: 'Equipment' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/pricebook', icon: CreditCard, label: 'Pricebook' },
  { to: '/agreements', icon: ShieldCheck, label: 'Agreements' },
  { to: '/warranties', icon: Star, label: 'Warranties' },
  { to: '/call-tracking', icon: Phone, label: 'Call Tracking' },
  { to: '/recurring', icon: Repeat, label: 'Recurring' },
  { to: '/takeoffs', icon: Scissors, label: 'Takeoffs' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/selections', icon: CheckSquare, label: 'Selections' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, company, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location, isMobile]);

  // Close sidebar on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen && isMobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isMobile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Link */}
      <SkipLink />
      
      {/* Route Announcer */}
      <RouteAnnouncer />

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col
          transform transition-transform duration-200 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <Building className="w-8 h-8 text-orange-500" aria-hidden="true" />
            <span className="font-bold text-lg text-gray-900">BuildPro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company */}
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium text-gray-900 truncate">{company?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Sidebar">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${isActive 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings */}
        <div className="border-t p-3">
          <NavLink
            to="/factory"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-1
              ${isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <Package className="w-5 h-5" aria-hidden="true" />
            <span>Factory</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              ${isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b h-16">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search (desktop) */}
            <div className="hidden md:block flex-1 max-w-md ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  aria-label="Search"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <div 
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                title={connected ? 'Connected' : 'Disconnected'}
                aria-label={connected ? 'Real-time updates connected' : 'Real-time updates disconnected'}
              />

              {/* Notifications */}
              <button
                className="p-2 hover:bg-gray-100 rounded-lg relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-600" aria-hidden="true" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div 
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border z-50"
                      role="menu"
                    >
                      <div className="p-3 border-b">
                        <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <NavLink
                          to="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" aria-hidden="true" />
                          Settings
                        </NavLink>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="p-4 lg:p-6" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
