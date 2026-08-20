import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@lastbench/shared';
import { useAuthStore } from '../stores/auth-store';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleButton } from '../components/GoogleButton';
import { api } from '../lib/api-client';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Google sign-in failed. Please try again or use email/password.',
  oauth_not_configured: 'Google sign-in is not available right now. Please use email/password.',
};

export function LoginPage() {
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // The API redirects here with ?error=... after a failed/misconfigured
  // Google OAuth attempt. Show it once, then strip it from the URL so a
  // page refresh doesn't re-show a stale toast.
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast.error(OAUTH_ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.');
      setSearchParams((prev) => {
        prev.delete('error');
        return prev;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setUnverifiedEmail(null);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('verify your email')) {
        setUnverifiedEmail(data.email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      await api.resendVerification(unverifiedEmail);
      toast.success('A new verification email has been sent to your inbox!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
      </div>

      {unverifiedEmail && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Email Verification Required</p>
              <p className="text-muted-foreground text-xs mt-1">
                Your account (<span className="text-foreground font-medium">{unverifiedEmail}</span>) has not been verified yet. Please check your email for the activation link.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full py-2.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-muted transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResending ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              'Resend Verification Email'
            )}
          </button>
        </motion.div>
      )}

      {/* Google OAuth */}
      <GoogleButton />

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="login-email"
              {...register('email')}
              type="email"
              disabled={isSubmitting}
              placeholder="you@college.edu"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="login-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              disabled={isSubmitting}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            {errors.password ? (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            ) : <span />}
            <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium ml-auto">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Sign In <ArrowRight size={18} /></>
          )}
        </button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary hover:underline font-medium">Create one</Link>
      </p>
    </div>
  );
}
