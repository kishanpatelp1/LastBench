import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Eye, EyeOff, X, BarChart3, Plus, Trash2, Image as ImageIcon, Loader, Shield, Sparkles, PenSquare, Search, Users, ChevronDown, Check, Link as LinkIcon, Video, Film, ExternalLink } from 'lucide-react';
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

interface PostComposerProps {
  communityId?: string;
  onClose?: () => void;
  initialOpen?: boolean;
}

export function PostComposer({ communityId: initialCommunityId, onClose, initialOpen = false }: PostComposerProps = {}) {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [communityId, setCommunityId] = useState(initialCommunityId || '');
  const [groupSearch, setGroupSearch] = useState('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [postType, setPostType] = useState<'TEXT' | 'IMAGE' | 'POLL' | 'LINK' | 'VIDEO'>('TEXT');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; file: File }>>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; file?: File } | null>(null);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (initialOpen) setIsOpen(true);
  }, [initialOpen]);

  const { data: groups } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api.getCommunities({ limit: '50' }).then((res) => res.items),
  });

  const [communityIdInitialized, setCommunityIdInitialized] = useState(false);
  useEffect(() => {
    if (!communityIdInitialized && !initialCommunityId && groups && groups.length > 0) {
      const generalGroup = groups.find((g) => g.slug === 'general') || groups[0];
      if (generalGroup) setCommunityId(generalGroup.id);
      setCommunityIdInitialized(true);
    }
  }, [groups, communityIdInitialized, initialCommunityId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedGroup = useMemo(() => {
    if (!communityId) return null;
    return groups?.find((g) => g.id === communityId) ?? null;
  }, [groups, communityId]);

  const generalGroup = useMemo(() => groups?.find((g) => g.slug === 'general') ?? null, [groups]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase().trim();
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q));
  }, [groups, groupSearch]);

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
    if (pollOptions.length < 6) setPollOptions([...pollOptions, '']);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (selectedImages.length + files.length > 4) {
      toast.error('You can upload at most 4 images per post');
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB`);
          continue;
        }
        const res = await api.uploadFile(file);
        setSelectedImages((prev) => [...prev, { url: res.url, file }]);
      }
      setPostType('IMAGE');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be less than 50MB');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      setSelectedVideo({ url: res.url, file });
      setPostType('VIDEO');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Video upload failed');
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedImages.length === 1) setPostType('TEXT');
  };

  const resetForm = () => {
    setContent('');
    setTitle('');
    setLinkUrl('');
    setIsAnonymous(false);
    setPostType('TEXT');
    setPollOptions(['', '']);
    setSelectedImages([]);
    setSelectedVideo(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    const targetCommunityId = communityId || generalGroup?.id || groups?.[0]?.id;

    if (!content.trim() || !targetCommunityId) {
      toast.error('Please enter post content');
      return;
    }

    if (postType === 'IMAGE' && selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    if (postType === 'VIDEO' && !selectedVideo) {
      toast.error('Please select a video file');
      return;
    }

    if (postType === 'LINK' && !linkUrl.trim()) {
      toast.error('Please enter an external URL link');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        content: content.trim(),
        title: title.trim() || undefined,
        communityId: targetCommunityId,
        isAnonymous,
        type: postType,
      };

      if (postType === 'LINK' && linkUrl.trim()) {
        payload.linkUrl = linkUrl.trim();
      }

      if (postType === 'IMAGE') {
        payload.mediaUrls = selectedImages.map((img) => img.url);
      }

      if (postType === 'VIDEO' && selectedVideo) {
        payload.mediaUrls = [selectedVideo.url];
      }

      if (postType === 'POLL') {
        const filteredOptions = pollOptions.filter((opt) => opt.trim() !== '');
        if (filteredOptions.length < 2) {
          toast.error('Poll must have at least 2 non-empty options');
          setIsSubmitting(false);
          return;
        }
        payload.poll = { options: filteredOptions };
      }

      await api.createPost(payload);
      triggerConfetti();
      toast.success('Post created successfully!');
      resetForm();
      handleClose();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden relative">
      {/* Confetti Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        {confettiParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: '50%', y: '50%', scale: 1, rotate: 0, opacity: 1 }}
            animate={{
              x: `calc(50% + ${p.targetX}px)`,
              y: `calc(50% + ${p.targetY}px)`,
              scale: 0.2,
              rotate: p.rotation,
              opacity: 0,
            }}
            transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.size > 8 ? '2px' : '50%',
            }}
          />
        ))}
      </div>

      {/* Collapsed state */}
      {!isOpen && (
        <div className="p-2.5 sm:p-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {user?.displayName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <button
              onClick={() => setIsOpen(true)}
              className="flex-1 min-w-0 text-left px-3 sm:px-4 py-2 bg-secondary rounded-full text-xs sm:text-sm text-muted-foreground hover:bg-secondary/80 transition-colors font-medium flex items-center gap-2 cursor-pointer truncate"
            >
              <PenSquare size={14} className="text-primary shrink-0" />
              <span className="truncate">Create a post or share with campus...</span>
            </button>
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button onClick={() => { setIsOpen(true); setPostType('IMAGE'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer" title="Add image">
                <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button onClick={() => { setIsOpen(true); setPostType('VIDEO'); }} className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer" title="Add video">
                <Video size={18} />
              </button>
              <button onClick={() => { setIsOpen(true); setPostType('LINK'); }} className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer" title="Embed link">
                <LinkIcon size={18} />
              </button>
              <button onClick={() => { setIsOpen(true); setPostType('POLL'); }} className="p-1.5 sm:p-2 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer" title="Create poll">
                <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded state */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Create a Post</h3>
              </div>
              <button onClick={handleClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Searchable Target Group Picker */}
              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-muted-foreground">Select Group / Community</label>
                
                <div
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedGroup ? (
                      <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {selectedGroup.name[0]}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center text-xs shrink-0">🏠</div>
                    )}
                    <span className="text-xs font-bold text-foreground truncate">
                      {selectedGroup ? `g/${selectedGroup.slug}` : 'General Feed'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      — {selectedGroup?.name ?? 'No specific group'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-xs font-semibold text-primary">
                    <span>Choose</span>
                    <ChevronDown size={14} className={`transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isGroupDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="composer-group-search"
                        name="groupSearch"
                        aria-label="Search groups"
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Search groups (e.g. g/confessions, g/sports)..."
                        className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1 divide-y divide-border/50">
                      {/* General Feed option — always visible at top */}
                      {!groupSearch.trim() && generalGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            setCommunityId(generalGroup.id);
                            setIsGroupDropdownOpen(false);
                            setGroupSearch('');
                          }}
                          className={`w-full text-left p-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            communityId === generalGroup.id ? 'bg-primary/10 text-foreground font-semibold' : 'hover:bg-secondary text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded bg-secondary border border-border flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                              🏠
                            </div>
                            <span className="font-bold">General Feed</span>
                            <span className="text-muted-foreground truncate">No specific group</span>
                          </div>
                          {communityId === generalGroup.id && <Check size={14} className="text-primary shrink-0" />}
                        </button>
                      )}

                      {filteredGroups.length === 0 && groupSearch.trim() ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No groups found matching &quot;{groupSearch}&quot;
                        </div>
                      ) : (
                        filteredGroups.map((g) => {
                          const isSelected = g.id === communityId;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setCommunityId(g.id);
                                setIsGroupDropdownOpen(false);
                                setGroupSearch('');
                              }}
                              className={`w-full text-left p-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected ? 'bg-primary/10 text-foreground font-semibold' : 'hover:bg-secondary text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {g.name[0]}
                                </div>
                                <span className="font-bold">g/{g.slug}</span>
                                <span className="text-muted-foreground truncate">{g.name}</span>
                              </div>
                              {isSelected && <Check size={14} className="text-primary shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Explicit Privacy Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Posting Privacy</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Choose how your post appears</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(false)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      !isAnonymous
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Eye size={14} />
                    <span>Public (u/{user?.username || 'user'})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(true)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      isAnonymous
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <EyeOff size={14} />
                    <span>Anonymous</span>
                  </button>
                </div>
                
                <div className={`p-2 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                  isAnonymous 
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                }`}>
                  <Shield size={12} className="shrink-0" />
                  <span>
                    {isAnonymous
                      ? 'Anonymous Post: Your name and profile will be hidden. Posted as u/Anonymous.'
                      : `Public Post: Posted under your campus handle u/${user?.username || 'user'}.`}
                  </span>
                </div>
              </div>

              {/* Title (Optional) */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
              />

              {/* LINK EMBED INPUT */}
              {postType === 'LINK' && (
                <div className="space-y-1.5 p-3 rounded-lg bg-secondary/40 border border-primary/30">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <LinkIcon size={14} className="text-primary" /> Embed External URL Link
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste link URL (e.g. https://github.com/..., https://youtube.com/watch?v=...)"
                    className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Pasted link will generate a clickable preview card on your post.</p>
                </div>
              )}

              {/* Content Body */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Share campus news, questions, or memes..."
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
              />

              {/* IMAGE UPLOAD PREVIEW */}
              {postType === 'IMAGE' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Images ({selectedImages.length}/4)</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || selectedImages.length >= 4}
                      className="text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      + Add image
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden border border-border bg-secondary aspect-square">
                        <img src={img.url} alt="Upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIDEO UPLOAD PREVIEW */}
              {postType === 'VIDEO' && (
                <div className="space-y-2 p-3 rounded-lg bg-secondary/40 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Film size={14} className="text-primary" /> Video Attachment
                    </span>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      {selectedVideo ? 'Change Video' : '+ Select Video'}
                    </button>
                  </div>

                  {selectedVideo ? (
                    <div className="relative rounded-lg overflow-hidden bg-black max-h-48 border border-border">
                      <video src={selectedVideo.url} controls className="w-full max-h-48 object-contain" />
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(null)}
                        className="absolute top-2 right-2 p-1 bg-black/80 text-white rounded-full hover:bg-black"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="py-8 border-2 border-dashed border-border rounded-lg text-center cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <Film size={24} className="mx-auto text-primary mb-1" />
                      <p className="text-xs font-semibold text-foreground">Click to upload campus video</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">MP4, WEBM, MOV up to 50MB</p>
                    </div>
                  )}
                </div>
              )}

              {/* POLL COMPOSER */}
              {postType === 'POLL' && (
                <div className="space-y-2.5 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Poll Options</span>
                    <span className="text-[10px] text-muted-foreground">Minimum 2 options required</span>
                  </div>

                  <div className="space-y-2">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          id={`composer-poll-option-${i}`}
                          name={`pollOption_${i}`}
                          aria-label={`Poll Option ${i + 1}`}
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(i)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Plus size={12} /> Add option
                    </button>
                  )}
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                id="composer-image-file-input"
                name="imageFileInput"
                aria-label="Upload image files"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                id="composer-video-file-input"
                name="videoFileInput"
                aria-label="Upload video file"
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />

              {/* BOTTOM ACTIONS BAR */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (postType === 'IMAGE') setPostType('TEXT');
                      else fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                    className={`p-2 rounded-md transition-colors cursor-pointer ${
                      postType === 'IMAGE' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    title="Upload images"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (postType === 'VIDEO') setPostType('TEXT');
                      else videoInputRef.current?.click();
                    }}
                    disabled={isUploading}
                    className={`p-2 rounded-md transition-colors cursor-pointer ${
                      postType === 'VIDEO' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    title="Upload video"
                  >
                    <Video size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (postType === 'LINK') setPostType('TEXT');
                      else setPostType('LINK');
                    }}
                    className={`p-2 rounded-md transition-colors cursor-pointer ${
                      postType === 'LINK' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    title="Embed link"
                  >
                    <LinkIcon size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (postType === 'POLL') setPostType('TEXT');
                      else setPostType('POLL');
                    }}
                    className={`p-2 rounded-md transition-colors cursor-pointer ${
                      postType === 'POLL' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    title="Create a poll"
                  >
                    <BarChart3 size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-1.5 rounded-full border border-border text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isUploading || !content.trim()}
                    className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Post</span>
                        <Send size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
