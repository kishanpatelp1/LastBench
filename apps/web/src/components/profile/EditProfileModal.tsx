import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    branch: user?.branch || '',
    year: user?.year ? String(user.year) : '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Clean up data before sending
      const dataToSubmit = {
        username: formData.username.trim() !== user?.username ? formData.username.trim() : undefined,
        displayName: formData.displayName.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        branch: formData.branch.trim() || undefined,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
      };

      await api.updateProfile(dataToSubmit);
      
      // Update local state
      if (user) {
        setUser({ 
          ...user,
          username: dataToSubmit.username ?? user.username,
          displayName: dataToSubmit.displayName ?? user.displayName,
          bio: dataToSubmit.bio ?? user.bio,
          branch: dataToSubmit.branch ?? user.branch,
          year: dataToSubmit.year ?? user.year,
        });
      }
      
      toast.success('Profile updated successfully');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg p-6 overflow-hidden border shadow-xl bg-card rounded-2xl border-border max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Edit Profile</h2>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium flex items-center justify-between">
                <span>Campus Handle</span>
                <span className="text-xs font-semibold text-primary/80">Required</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground font-semibold">u/</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="cool_student"
                  required
                  className="w-full pl-8 pr-4 py-2 bg-transparent border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-border font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">Display Name (Optional)</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="w-full px-4 py-2 bg-transparent border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full px-4 py-2 bg-transparent border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="branch" className="text-sm font-medium">Branch / Major</label>
              <input
                id="branch"
                name="branch"
                type="text"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Computer Science"
                className="w-full px-4 py-2 bg-transparent border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="year" className="text-sm font-medium">Year of Study</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary border-border"
              >
                <option value="" className="bg-background">Select Year</option>
                <option value="1" className="bg-background">1st Year</option>
                <option value="2" className="bg-background">2nd Year</option>
                <option value="3" className="bg-background">3rd Year</option>
                <option value="4" className="bg-background">4th Year</option>
                <option value="5" className="bg-background">5th Year</option>
              </select>
            </div>

            <div className="flex justify-end pt-4 space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium transition-colors rounded-lg hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 font-medium text-white transition-colors rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
