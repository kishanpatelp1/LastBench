import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@lastbench/shared';
import { api } from '../lib/api-client';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ArrowRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { z } from 'zod';

const formSchema = resetPasswordSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { token: token || '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await api.resetPassword(data.token, data.password);
      toast.success('Password reset successfully! Please sign in again.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
          <p className="text-muted-foreground mt-2">Invalid or missing reset token</p>
        </div>
        <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <XCircle className="w-16 h-16 text-red-500" />
            <Link to="/forgot-password" className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/25 transition-all cursor-pointer">
              Request new link <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
        <p className="text-muted-foreground mt-2">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...register('token')} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>}
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
            <>Reset Password <ArrowRight size={18} /></>
          )}
        </motion.button>
      </form>
    </div>
  );
}
