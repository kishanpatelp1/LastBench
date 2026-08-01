import { useAuthStore } from '../stores/auth-store';
import { Mail, GraduationCap, Calendar, Settings, LogOut, Upload, X, Loader2 } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { PostCard } from '../components/feed/PostCard';
import { User, Post } from '../types';

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user: currentUser, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwnProfile = !routeUsername || (currentUser && routeUsername.toLowerCase() === currentUser.username.toLowerCase());
  const targetUsername = isOwnProfile ? currentUser?.username : routeUsername;

  // Query profile info if viewing someone else
  const { data: targetProfileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile', targetUsername],
    queryFn: () => api.getUserProfile(targetUsername!),
    enabled: !isOwnProfile && !!targetUsername,
  });

  const profileUser: User | null = isOwnProfile ? (currentUser as unknown as User) : (targetProfileData as unknown as User);

  // Query user posts stream
  // When viewing own profile: use authorId to include anonymous posts
  // When viewing others' profile: use authorUsername (only public non-anonymous posts)
  const { data: userPostsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['user-posts-stream', targetUsername, isOwnProfile],
    queryFn: () => {
      if (isOwnProfile && currentUser?.id) {
        return api.getUserPosts({ authorId: currentUser.id, limit: '30' });
      }
      return api.getFeed({ authorUsername: targetUsername!, limit: '30' });
    },
    enabled: isOwnProfile ? !!currentUser?.id : !!targetUsername,
  });

  const userPosts: Post[] = (userPostsData?.items || []) as unknown as Post[];

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files?.[0] || !isOwnProfile) return;

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
      if (currentUser) setUser({ ...currentUser, avatarUrl: response.url });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnProfile) return;
    setIsUploading(true);
    try {
      await api.updateProfile({ avatarUrl: '' });
      if (currentUser) setUser({ ...currentUser, avatarUrl: null });
      toast.success('Profile picture removed!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setIsUploading(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 size={20} className="animate-spin text-primary" /> Loading profile...
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-16 text-center text-muted-foreground">
        <h2 className="text-xl font-bold text-foreground mb-2">User Not Found</h2>
        <p className="text-xs mb-4">No student profile found for u/{routeUsername}</p>
        <Link to="/feed" className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md">Return to Feed</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      {/* MAIN COLUMN: Header Banner + Posts Stream */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Banner + Avatar Hero Card */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          {/* Gradient banner — same style as group pages */}
          <div
            className="h-28"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.3) 0%, hsl(var(--primary)/0.08) 60%, hsl(var(--primary)/0.02) 100%)' }}
          />
          <div className="px-5 pb-4 -mt-9 flex items-end justify-between gap-4">
            <div className="relative group">
              {profileUser.avatarUrl ? (
                <img
                  src={profileUser.avatarUrl}
                  alt={profileUser.displayName || profileUser.username}
                  className="w-16 h-16 rounded-md object-cover border-2 border-card shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl border-2 border-card">
                  {profileUser.displayName?.[0]?.toUpperCase() || profileUser.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              {isOwnProfile && (
                <>
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
                    className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full shadow hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Upload avatar"
                  >
                    <Upload size={12} />
                  </button>
                  {profileUser.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isUploading}
                      className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-full shadow hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove avatar"
                    >
                      <X size={10} />
                    </button>
                  )}
                </>
              )}
            </div>

            {isOwnProfile && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-secondary border border-border text-foreground font-medium text-xs flex items-center gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <Settings size={14} /> Edit Profile
                </button>
                <button
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="p-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <h1 className="text-xl font-bold text-foreground">{profileUser.displayName || profileUser.username}</h1>
            <p className="text-xs text-muted-foreground font-semibold">u/{profileUser.username}</p>
            {profileUser.bio && <p className="text-sm text-foreground/90 mt-2">{profileUser.bio}</p>}
          </div>
        </div>

        {/* Post Tabs */}
        <div className="flex gap-0 bg-card border border-border rounded-md overflow-hidden w-fit">
          <div className="px-4 py-2 text-sm font-semibold bg-secondary text-foreground">
            {isOwnProfile ? 'My Posts' : `Posts by u/${profileUser.username}`} ({userPosts.length})
          </div>
        </div>

        {/* User Posts Stream */}
        <div className="space-y-2">
          {isPostsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-md h-28 animate-pulse skeleton" />
            ))
          ) : userPosts.length === 0 ? (
            <div className="bg-card border border-border rounded-md py-12 text-center text-muted-foreground text-sm">
              {isOwnProfile ? "You haven't posted anything yet." : `u/${profileUser.username} has no public posts yet.`}
            </div>
          ) : (
            userPosts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Profile Meta & Info */}
      <aside className="hidden lg:block w-80 flex-shrink-0 space-y-3 sticky top-16 self-start">
        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <div className="text-sm font-semibold border-b border-border pb-2">Student Info</div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded bg-secondary border border-border">
              <div className="text-xs text-muted-foreground font-medium">Posts</div>
              <div className="text-lg font-bold text-foreground">{profileUser._count?.posts ?? userPosts.length}</div>
            </div>
            <div className="p-2.5 rounded bg-secondary border border-border">
              <div className="text-xs text-muted-foreground font-medium">Comments</div>
              <div className="text-lg font-bold text-foreground">{profileUser._count?.comments ?? 0}</div>
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs text-muted-foreground">
            {isOwnProfile && profileUser.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-muted-foreground" />
                <span className="truncate">{profileUser.email}</span>
              </div>
            )}
            {(profileUser.branch || profileUser.year) && (
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="text-muted-foreground" />
                <span>
                  {profileUser.branch ? profileUser.branch : ''}
                  {profileUser.branch && profileUser.year ? ' • ' : ''}
                  {profileUser.year ? `Year ${profileUser.year}` : ''}
                </span>
              </div>
            )}
            {profileUser.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span>Joined {new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />}
    </div>
  );
}
