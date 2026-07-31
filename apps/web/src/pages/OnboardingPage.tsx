import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { toast } from 'sonner';

export function OnboardingPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Declarative redirect for users who have already completed onboarding
  if (!user || user.onboardingCompleted !== false) {
    return <Navigate to="/feed" replace />;
  }

  const [formData, setFormData] = useState({
    username: user?.username || '',
    branch: user?.branch || '',
    year: user?.year ? String(user.year) : '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        username: formData.username.trim() !== user?.username ? formData.username.trim() : undefined,
        branch: formData.branch.trim() || undefined,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
      };

      await api.updateProfile(dataToSubmit);
      
      setUser({ 
        ...user,
        username: dataToSubmit.username ?? user.username,
        branch: dataToSubmit.branch ?? user.branch,
        year: dataToSubmit.year ?? user.year,
        onboardingCompleted: true,
      });
      
      toast.success('Welcome to LastBench! 🎉');
      navigate('/feed', { replace: true });
    } catch (err) {
      toast.error('Something went wrong saving your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 border bg-card rounded-xl border-border shadow-sm"
      >
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">
            LB
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.displayName?.split(' ')[0] || user?.username || 'there'}! 👋
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Set your campus handle and academic info to complete setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Campus Handle</span>
              <span className="text-[10px] text-primary">Required</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-muted-foreground text-xs font-bold">u/</span>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="cool_student"
                required
                className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="branch" className="text-xs font-semibold text-foreground">Branch / Department</label>
            <input
              id="branch"
              name="branch"
              type="text"
              value={formData.branch}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="year" className="text-xs font-semibold text-foreground">Year of Study</label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
              <option value="5">5th Year</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 font-semibold text-sm text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Complete Setup <ArrowRight size={16} className="ml-1.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
