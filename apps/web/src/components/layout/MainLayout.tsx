import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, Bell, User, LogOut, Sun, Moon, Compass, Menu, X, Users, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count ?? 0;

  const publicNavItems = [
    { path: '/feed', label: 'Feed', icon: Home },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/search', label: 'Search', icon: Search },
  ];

  const navItems = [
    ...publicNavItems,
    ...(isAuthenticated ? [
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/profile', label: 'Profile', icon: User },
    ] : []),
    ...(isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'MODERATOR') ? [
      { path: '/admin', label: 'Admin', icon: ShieldAlert },
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Desktop Navbar ───────────────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/feed" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">
              <span className="gradient-text">LastBench</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <div className="relative flex items-center justify-center">
                    <item.icon size={18} />
                    {item.path === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 px-1 min-w-[16px] h-[16px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{user?.displayName ?? user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.branch ?? 'Student'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-secondary transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu ──────────────────────────── */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden glass border-b border-border px-4 py-3 space-y-1"
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all',
                location.pathname.startsWith(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          ))}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all">
              <LogOut size={18} />
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary w-full transition-all"
              >
                Login
              </button>
              <button
                onClick={() => {
                  navigate('/register');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 w-full transition-all"
              >
                Sign Up
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* ─── Main Content ─────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ─── Mobile Bottom Nav ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 6).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon size={20} />
                  {item.path === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
