import { Outlet, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/auth-store';

export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950 items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-2xl animate-glow" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/30">
            <span className="text-white font-black text-3xl">L</span>
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight">LastBench</h1>
            <p className="text-violet-200/80 text-lg mt-3 max-w-sm mx-auto">Your campus. Unfiltered.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {['Anonymous Posts', 'Communities', 'Polls', 'Realtime', 'Dark Mode'].map((tag) => (
              <span key={tag} className="px-4 py-2 rounded-full bg-white/10 text-violet-200 backdrop-blur-sm border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20 mb-4">
              <span className="text-white font-black text-xl">L</span>
            </div>
            <h1 className="text-3xl font-black gradient-text">LastBench</h1>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
