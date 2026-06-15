import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../store/authStore';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Flame,
  CheckSquare,
  Compass,
  TrendingUp
} from 'lucide-react';

export const PageWrapper: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        navigate('/dashboard');
      } else if (key === 'f') {
        e.preventDefault();
        navigate('/focus');
      } else if (key === 'n') {
        e.preventDefault();
        navigate('/tasks?create=true');
      } else if (key === 'h') {
        e.preventDefault();
        navigate('/habits?create=true');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Map route names to display headers
  const getPageTitle = () => {
    const path = window.location.pathname;
    if (path.includes('/dashboard')) return 'Today\'s Symphony';
    if (path.includes('/habits')) return 'Habit Orchestrator';
    if (path.includes('/tasks')) return 'Task Command';
    if (path.includes('/calendar')) return 'Time Matrix';
    if (path.includes('/health')) return 'Biometrics Health';
    if (path.includes('/focus')) return 'Deep Focus Chamber';
    if (path.includes('/weekly-review')) return 'Sunday Review Report';
    if (path.includes('/settings')) return 'System Settings';
    return 'Life Director';
  };

  const mobileNavItems = [
    { label: 'Home', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Habits', path: '/habits', icon: <Flame size={20} /> },
    { label: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} /> },
    { label: 'Focus', path: '/focus', icon: <Compass size={20} /> },
    { label: 'Health', path: '/health', icon: <TrendingUp size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-bg-dark text-text-primary overflow-hidden">
      {/* Sidebar - Collapsible on Desktop, sliding drawer on Mobile */}
      <div className={`md:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
        />
        {/* Mobile menu backdrop */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 md:hidden"
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Topbar
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          title={getPageTitle()}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-card/85 backdrop-blur-lg border-t border-white/10 flex items-center justify-around z-30 md:hidden px-4">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all duration-200 ${isActive ? 'text-accent-primary scale-110' : 'text-text-secondary hover:text-text-primary'}`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
