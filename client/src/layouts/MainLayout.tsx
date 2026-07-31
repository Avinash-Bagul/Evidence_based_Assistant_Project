import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  FileSearch,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Derive a simple page title from the path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/documents')) return 'Documents';
    if (path.includes('/plan')) return 'Research Plan';
    if (path.includes('/evidence')) return 'Evidence Explorer';
    if (path.includes('/brief')) return 'Research Brief';
    if (path.includes('/versions')) return 'Version History';
    if (path.includes('/followup')) return 'Follow-up Questions';
    if (path.includes('/logs')) return 'Workflow Logs';
    if (path.startsWith('/projects/')) return 'Project Details';
    if (path === '/projects') return 'Projects';
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/settings') return 'Settings';
    return '';
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600/20 border border-primary-500/30">
              <FileSearch className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Research</h1>
              <p className="text-xs text-muted-foreground">Assistant</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-800'
                  )
                }
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="px-3 py-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-400">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ''}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-danger-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center px-4 border-b border-border bg-surface-900/80 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground mr-3 p-1 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {getPageTitle() && (
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground truncate">{getPageTitle()}</span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
