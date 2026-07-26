import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Eye, EyeOff, X, BarChart3, Plus, Trash2, Image as ImageIcon, Loader } from 'lucide-react';
import { api } from '../../lib/api-client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth-store';
import { toast } from 'sonner';
import { Community } from '../../types';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  targetX: number;
  targetY: number;
}

export function PostComposer() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [communityId, setCommunityId] = useState('');
  const [postType, setPostType] = useState<'TEXT' | 'IMAGE' | 'POLL'>('TEXT');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; file: File }>>([]);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getCommunities().then((res) => res.items as unknown as Community[]),
  });

  const triggerConfetti = () => {
    const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    const particles: ConfettiParticle[] = [];
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 250;
      particles.push({
        id: Math.random(),
        x: 0,
        y: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        size: 5 + Math.random() * 10,
        rotation: Math.random() * 360,
        targetX: Math.cos(angle) * distance,
        targetY: Math.sin(angle) * distance - (60 + Math.random() * 180),
      });
    }
    setConfettiParticles(particles);
    setTimeout(() => setConfettiParticles([]), 2500);
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  const addOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      const next = pollOptions.filter((_, i) => i !== index);
      setPollOptions(next);
    }
  };

  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} is not an image`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (selectedImages.length + validFiles.length > 4) {
      toast.error('Maximum 4 images per post');
      return;
    }

    setIsUploading(true);
    try {
      for (const file of validFiles) {
        const response = await api.uploadFile(file);
        setSelectedImages(prev => [...prev, { url: response.url, file }]);
      }
      setPostType('IMAGE');
      toast.success(`${validFiles.length} image(s) uploaded!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() || !communityId) {
      toast.error('Please fill in content and select a group');
      return;
    }

    if (postType === 'IMAGE' && selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        content: content.trim(),
        title: title.trim() || undefined,
        communityId,
        isAnonymous,
        type: postType,
      };

      if (postType === 'IMAGE') {
        payload.mediaUrls = selectedImages.map(img => img.url);
      }

      if (postType === 'POLL') {
        const filteredOptions = pollOptions.filter((opt) => opt.trim() !== '');
        if (filteredOptions.length < 2) {
          toast.error('Poll must have at least 2 non-empty options');
          setIsSubmitting(false);
          return;
        }
        payload.poll = {
          options: filteredOptions,
        };
      }

      await api.createPost(payload);
      setContent('');
      setTitle('');
      setPostType('TEXT');
      setPollOptions(['', '']);
      setSelectedImages([]);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      triggerConfetti();
      toast.success('Post created! 🎉');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative rounded-2xl bg-gradient-to-br from-violet-900/10 via-card to-fuchsia-900/10 border border-violet-500/20 p-6 overflow-hidden shadow-xl shadow-violet-500/5">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-fuchsia-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <h3 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-lastbench" />
              Join the Campus Conversation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Log in or create an account to start creating posts, casting poll votes, and sharing discussions across campus.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-card border border-border overflow-hidden">
      {/* Confetti Explosion */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {confettiParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            animate={{
              x: p.targetX,
              y: p.targetY,
              rotate: p.rotation + 360,
              opacity: 0,
              scale: 0.2,
            }}
            transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              zIndex: 50,
            }}
          />
        ))}
      </div>
      {/* Collapsed state */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.displayName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-muted-foreground text-sm">What's on your mind?</span>
        </button>
      )}

      {/* Expanded state */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Create Post</h3>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Post Type Selector */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setPostType('TEXT')}
                className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  postType === 'TEXT'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Text Post
              </button>
              <button
                type="button"
                onClick={() => setPostType('IMAGE')}
                className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  postType === 'IMAGE'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Photo
              </button>
              <button
                type="button"
                onClick={() => setPostType('POLL')}
                className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  postType === 'POLL'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Poll
              </button>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={postType === 'POLL' ? 'Ask a question...' : 'Share your thoughts...'}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />

            {/* Poll options configuration */}
            {postType === 'POLL' && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Poll Options</label>
                {pollOptions.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Add Option
                  </button>
                )}
              </div>
            )}

            {/* Image upload */}
            {postType === 'IMAGE' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e.target.files)}
                  className="hidden"
                />
                
                {selectedImages.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full p-6 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50 flex flex-col items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader size={24} className="text-primary animate-spin" />
                        <span className="text-sm font-medium text-muted-foreground">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={24} className="text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Click to upload or drag images here</span>
                        <span className="text-xs text-muted-foreground">Max 4 images, 5MB each (JPEG, PNG, GIF, WebP)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedImages.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Add More Images'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none"
            >
              <option value="" disabled>Select a group...</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isAnonymous
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'bg-secondary text-muted-foreground border border-border'
                  }`}
                >
                  {isAnonymous ? <EyeOff size={16} /> : <Eye size={16} />}
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center gap-2 text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/25 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Post
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
