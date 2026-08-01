import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/auth-store';
import { Shield, Users, BarChart3, Zap } from 'lucide-react';

export function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null;
  if (isAuthenticated && location.pathname !== '/verify-email') {
    const needsOnboarding = user?.onboardingCompleted === false;
    return <Navigate to={needsOnboarding ? '/onboarding' : '/feed'} replace />;
  }

  const features = [
    { icon: Shield, title: 'Anonymous & Authentic', desc: 'Share campus thoughts safely or post with your profile' },
    { icon: Users, title: 'Campus Groups', desc: 'Join department channels, branch hubs, and interest groups' },
    { icon: BarChart3, title: 'Live Polls', desc: 'Vote and see instant feedback on real student topics' },
    { icon: Zap, title: 'Instant Activity', desc: 'Realtime updates on what is happening across your campus' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side — branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-card border-r border-border flex-col justify-between p-12 relative overflow-hidden">
        <div>
          <Link to="/feed" className="flex items-center gap-2 text-foreground font-bold text-xl">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              LB
            </div>
            <span>LastBench</span>
          </Link>
          
          <div className="mt-16 space-y-3">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Your campus hub.</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Connect with fellow students, discuss classes, create polls, and explore groups.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
                className="flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} LastBench</span>
          <span>Campus Unfiltered</span>
        </div>
      </div>

      {/* Right side — form outlet */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/feed" className="inline-flex items-center gap-2 text-foreground font-bold text-2xl mb-2">
              <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                LB
              </div>
              <span>LastBench</span>
            </Link>
            <p className="text-sm text-muted-foreground">Your campus. Unfiltered.</p>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
