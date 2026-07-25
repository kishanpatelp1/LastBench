import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { toast } from 'sonner';

export function OnboardingPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      
      if (user) {
        setUser({ 
          ...user,
          username: dataToSubmit.username ?? user.username,
          branch: dataToSubmit.branch ?? user.branch,
          year: dataToSubmit.year ?? user.year,
        });
      }
      
      toast.success('Welcome to LastBench!');
      navigate('/feed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 border shadow-2xl bg-card rounded-2xl border-border"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Welcome, {user?.displayName?.split(' ')[0] || user?.username || 'Student'}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete your academic profile to join discussions and groups.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium flex items-center justify-between">
              <span>Campus Handle</span>
              <span className="text-xs font-semibold text-primary/80">Required</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-muted-foreground font-semibold">u/</span>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="cool_student"
                required
                className="w-full pl-9 pr-4 py-3 bg-secondary/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border-border transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="branch" className="text-sm font-medium">Branch / Major</label>
            <input
              id="branch"
              name="branch"
              type="text"
              value={formData.branch}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-3 bg-secondary/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border-border transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="year" className="text-sm font-medium">Year of Study</label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-secondary/50 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary border-border transition-all"
            >
              <option value="" className="bg-background">Select Year</option>
              <option value="1" className="bg-background">1st Year</option>
              <option value="2" className="bg-background">2nd Year</option>
              <option value="3" className="bg-background">3rd Year</option>
              <option value="4" className="bg-background">4th Year</option>
              <option value="5" className="bg-background">5th Year</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3.5 font-bold text-white transition-all rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Complete Onboarding <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
