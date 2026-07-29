import { useAuthStore } from '../stores/auth-store';
import { motion } from 'framer-motion';
import { Mail, GraduationCap, Calendar, MessageSquare, FileText, Settings, LogOut, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import { EditProfileModal } from '../components/profile/EditProfileModal';

export function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user) return null;

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const response = await api.uploadFile(file);
      await api.updateProfile({ avatarUrl: response.url });
      setAvatarUrl(response.url);
      setUser({ ...user, avatarUrl: response.url });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    try {
      await api.updateProfile({ avatarUrl: '' });
      setAvatarUrl(null);
      if (user) setUser({ ...user, avatarUrl: null });
      toast.success('Profile picture removed!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setIsUploading(false);
    }
  };

  const stats = [
    { label: 'Posts', value: user._count?.posts ?? '—', icon: FileText },
    { label: 'Comments', value: user._count?.comments ?? '—', icon: MessageSquare },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border overflow-hidden"
      >
        <div className="h-28 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
        <div className="px-6 pb-6 -mt-10">
          <div className="relative w-20 h-20 group">
            <img
              src={avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName || user.username}&background=a855f7&color=fff`}
              alt={user.displayName || user.username}
              className="w-20 h-20 rounded-2xl object-cover shadow-xl border-4 border-card"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarUpload(e.target.files)}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Upload profile picture"
            >
              {isUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
            </button>
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Remove profile picture"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-foreground">{user.displayName ?? user.username}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="text-sm text-foreground/85 mt-2">{user.bio}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-secondary border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <stat.icon size={14} />
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail size={16} /><span>{user.email}</span>
            </div>
            {(user.branch || user.year) && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <GraduationCap size={16} />
                <span>
                  {user.branch ? user.branch : ''}
                  {user.branch && user.year ? ' • ' : ''}
                  {user.year ? `Year ${user.year}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar size={16} /><span>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-medium flex items-center justify-center gap-2 text-sm hover:bg-muted transition-all cursor-pointer"
            >
              <Settings size={16} />Edit Profile
            </button>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 font-medium flex items-center justify-center gap-2 text-sm hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.div>
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
}
