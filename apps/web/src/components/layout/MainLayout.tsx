import { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, Search, Bell, User, Shield, Sun, Moon, LogOut, Menu, X, Plus } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { api } from '../../lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { PostComposer } from '../feed/PostComposer';
import { toast } from 'sonner';

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.getNotifications({ limit: '1' }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const hasUnread = (notifData && (notifData as any).length > 0) || (user as any)?.unreadCount > 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to create a post');
      navigate('/login');
      return;
    }
    setShowCreateModal(true);
  };

  const closeMenu = () => setMobileMenuOpen(false);
  const isAdminOrMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const NavItem = ({ to, icon: Icon, label, badge = false, onClick }: any) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? 'bg-secondary text-foreground font-semibold'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="w-2 h-2 rounded-full bg-primary" />
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar — Reddit Style */}
      <header className="h-14 bg-card border-b border-border fixed top-0 left-0 right-0 z-40 px-4 flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle + Logo */}
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-foreground cursor-pointer p-1">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/feed" className="font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-black shadow-sm">
              LB
            </div>
            <span className="hidden sm:inline">LastBench</span>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LastBench or ask what's happening on campus..."
            className="w-full pl-9 pr-4 py-1.5 rounded-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs font-medium transition-all"
          />
        </form>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button
                onClick={handleCreateClick}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={14} /> Create
              </button>

              <Link to="/notifications" className="p-2 text-muted-foreground hover:text-foreground relative rounded-full hover:bg-secondary transition-colors" title="Notifications">
                <Bell className="w-5 h-5" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />}
              </Link>

              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <Link to="/profile" className="flex items-center gap-2 pl-1 cursor-pointer">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm">
                    {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full border border-border text-foreground text-xs font-semibold hover:bg-secondary transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-card border-b border-border fixed top-14 left-0 right-0 z-30 shadow-lg"
          >
            <div className="p-4 flex flex-col gap-2">
              <form onSubmit={handleSearchSubmit} className="relative mb-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search LastBench or ask what's happening..."
                  className="w-full pl-9 pr-4 py-2 rounded-md bg-secondary border border-border text-foreground text-sm"
                />
              </form>
              <button
                onClick={() => { handleCreateClick(); closeMenu(); }}
                className="flex items-center gap-2 w-full px-3 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-md mb-1 cursor-pointer"
              >
                <Plus size={16} /> Create Post
              </button>
              <NavItem to="/feed" icon={Home} label="Home" onClick={closeMenu} />
              <NavItem to="/groups" icon={Users} label="Groups" onClick={closeMenu} />
              <NavItem to="/search" icon={Search} label="Search" onClick={closeMenu} />
              <div className="border-t border-border my-1" />
              {isAuthenticated && (
                <>
                  <NavItem to="/notifications" icon={Bell} label="Notifications" badge={hasUnread} onClick={closeMenu} />
                  <NavItem to="/profile" icon={User} label="Profile" onClick={closeMenu} />
                  {isAdminOrMod && <NavItem to="/admin" icon={Shield} label="Admin" onClick={closeMenu} />}
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { handleLogout(); closeMenu(); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg shadow-2xl rounded-md"
            >
              <PostComposer initialOpen={true} onClose={() => setShowCreateModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-14 bottom-0 left-0 w-56 bg-card border-r border-border z-30 p-3 space-y-1 overflow-y-auto">
        <NavItem to="/feed" icon={Home} label="Home" />
        <NavItem to="/groups" icon={Users} label="Groups" />
        <NavItem to="/search" icon={Search} label="Search" />
        <div className="border-t border-border my-2" />
        {isAuthenticated && (
          <>
            <NavItem to="/notifications" icon={Bell} label="Notifications" badge={hasUnread} />
            <NavItem to="/profile" icon={User} label="Profile" />
            {isAdminOrMod && <NavItem to="/admin" icon={Shield} label="Admin" />}
          </>
        )}
      </aside>

      {/* Main Content Body */}
      <main className="flex-1 md:ml-56 pt-14 pb-14 md:pb-6 min-h-[calc(100vh-3.5rem)] bg-background">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
