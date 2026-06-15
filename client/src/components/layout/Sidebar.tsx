import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Flame,
  Settings,
  Sun,
  Moon,
  Compass,
  Volume2,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse, isMobileOpen = false }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Habits', path: '/habits', icon: <Flame size={20} /> },
    { label: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} /> },
    { label: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> },
    { label: 'Health Tracker', path: '/health', icon: <TrendingUp size={20} /> },
    { label: 'Focus Mode', path: '/focus', icon: <Compass size={20} /> },
    { label: 'Weekly Review', path: '/weekly-review', icon: <Volume2 size={20} /> }, // custom reporter
    { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  // Draw mini calendar widget
  const today = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today),
  }).slice(0, 28); // restrict to 28 days for clean mini sidebar layout

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-bg-card border-r border-white/10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative`}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl font-display font-extrabold text-accent-primary">🧭 Life Director</span>
          </div>
        )}
        {isCollapsed && (
          <span className="text-xl font-display font-extrabold text-accent-primary mx-auto">🧭</span>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex p-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Profile */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-accent-primary/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-sm">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
          )}
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
              <div className="flex items-center gap-1 text-accent-gold mt-0.5">
                <Flame size={14} fill="currentColor" />
                <span className="text-xs font-mono font-bold">5 Day Streak</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Mini Calendar Widget */}
      {!isCollapsed && (
        <div className="p-4 mx-3 mb-2 rounded-card glass-panel bg-white/[0.01] border border-white/5 text-center hidden lg:block">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
            {format(today, 'MMMM yyyy')}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="text-[8px] font-bold text-text-muted">{d}</span>
            ))}
            {daysInMonth.map((day, idx) => {
              const isToday = isSameDay(day, today);
              return (
                <span
                  key={idx}
                  className={`text-[9px] font-mono p-0.5 rounded flex items-center justify-center ${isToday ? 'bg-accent-primary text-text-primary font-bold' : 'text-text-secondary'}`}
                >
                  {format(day, 'd')}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer controls */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-semibold text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all duration-200"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-semibold text-accent-warm hover:bg-accent-warm/10 transition-all duration-200"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
