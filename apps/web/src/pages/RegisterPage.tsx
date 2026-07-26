import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@lastbench/shared';
import { useAuthStore } from '../stores/auth-store';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleButton } from '../components/GoogleButton';
import { api } from '../lib/api-client';

export function RegisterPage() {
  const { register: registerUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { year: undefined },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    try {
      const result = await registerUser(data as Record<string, unknown>);
      if (result.requireVerification) {
        setRegisteredEmail(data.email);
        toast.success('Account created! Please check your inbox to verify your email.');
      } else {
        toast.success('Account created! Welcome to LastBench 🎉');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await api.resendVerification(registeredEmail);
      toast.success('A fresh verification link has been sent to your inbox!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const inputClass = 'w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm disabled:opacity-50';

  if (registeredEmail) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-center py-4"
      >
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
          <Mail size={32} className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Check your inbox</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            We sent a verification link to <span className="text-foreground font-semibold">{registeredEmail}</span>. You need to verify your student email before logging in.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/60 border border-border text-left text-xs space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Next steps:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Open your email client and find the email from <span className="font-mono text-primary">LastBench</span>.</li>
            <li>Click the verification link in the email to activate your account.</li>
            <li>Once confirmed, log in to set up your profile and join community discussions.</li>
            <li>Don&apos;t see it? Check your spam or promotions folder.</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-secondary border border-border text-foreground font-medium hover:bg-muted transition-all text-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isResending ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              'Resend Verification Email'
            )}
          </button>
          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Create account</h2>
        <p className="text-muted-foreground mt-2">Join your campus community anonymously</p>
      </div>

      {/* Google OAuth */}
      <GoogleButton />

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input {...register('username')} disabled={isSubmitting} placeholder="anon_coder" className={inputClass} />
            </div>
            {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input {...register('displayName')} disabled={isSubmitting} placeholder="Display Name" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input {...register('email')} disabled={isSubmitting} type="email" placeholder="you@college.edu" className={inputClass} />
          </div>
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input {...register('password')} disabled={isSubmitting} type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars, 1 uppercase, 1 number" className={`${inputClass} !pr-12`} />
            <button type="button" disabled={isSubmitting} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer disabled:opacity-50">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Branch</label>
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input {...register('branch')} disabled={isSubmitting} placeholder="CS" className={inputClass} />
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Create Account <ArrowRight size={18} /></>
          )}
        </motion.button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
