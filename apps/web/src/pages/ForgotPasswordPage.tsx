import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@lastbench/shared';
import { api } from '../lib/api-client';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      await api.forgotPassword(data.email);
      setIsSuccess(true);
    } catch (err) {
      // Always show success message for security reasons
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Check your email</h2>
          <p className="text-muted-foreground mt-2">We've sent a password reset link to your email address.</p>
        </div>
        <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <Link to="/login" className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all cursor-pointer">
              Back to Sign In <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Forgot Password</h2>
        <p className="text-muted-foreground mt-2">Enter your email and we'll send you a reset link</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              {...register('email')}
              type="email"
              placeholder="you@college.edu"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
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
            <>Send Reset Link <ArrowRight size={18} /></>
          )}
        </motion.button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
