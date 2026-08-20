import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, MoreHorizontal, Pin, Trash2, Check, ExternalLink, Flag, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Post } from '../../types';
import { useAuthStore } from '../../stores/auth-store';
import { api } from '../../lib/api-client';
import { MediaLightbox } from './MediaLightbox';
import { FeedVideoPlayer } from './FeedVideoPlayer';

interface PostCardProps {
  post: Post;
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2]?.length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function renderClickableText(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline hover:text-primary/80 font-medium inline-flex items-center gap-0.5"
        >
          {part}
          <ExternalLink size={12} className="inline ml-0.5 shrink-0" />
        </a>
      );
    }
    return part;
  });
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showVideoLightbox, setShowVideoLightbox] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = user?.id === post.author?.id;
  const isAdminOrMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const canDelete = isAuthor || isAdminOrMod;
  const canReport = isAuthenticated && !isAuthor;
  const showMenu = isAuthenticated;

  const [optimisticVote, setOptimisticVote] = useState<'UP' | 'DOWN' | null>(post.userVote ?? null);
  const [optimisticScore, setOptimisticScore] = useState<number>(post.score ?? 0);

  useEffect(() => {
    setOptimisticVote(post.userVote ?? null);
    setOptimisticScore(post.score ?? 0);
  }, [post.userVote, post.score]);

  const isUpvoted = optimisticVote === 'UP';
  const isDownvoted = optimisticVote === 'DOWN';

  const handleVote = async (e: React.SyntheticEvent, type: 'UP' | 'DOWN') => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      navigate('/login');
      return;
    }

    const prevVote = optimisticVote;
    const prevScore = optimisticScore;

    let nextVote: 'UP' | 'DOWN' | null = type;
    let scoreDelta = 0;

    if (prevVote === type) {
      nextVote = null;
      scoreDelta = type === 'UP' ? -1 : 1;
    } else if (prevVote === null) {
      nextVote = type;
      scoreDelta = type === 'UP' ? 1 : -1;
    } else {
      nextVote = type;
      scoreDelta = type === 'UP' ? 2 : -2;
    }

    // Instant zero-latency local update
    setOptimisticVote(nextVote);
    setOptimisticScore(prevScore + scoreDelta);

    try {
      await api.votePost(post.id, type);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
    } catch {
      // Revert upon server rejection
      setOptimisticVote(prevVote);
      setOptimisticScore(prevScore);
      toast.error('Vote failed to register');
    }
  };

  const handlePollVote = async (e: React.SyntheticEvent, optionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to vote in polls');
      navigate('/login');
      return;
    }

    try {
      await api.votePoll(post.poll!.id, optionId);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
      toast.success('Vote submitted!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to vote in poll';
      toast.error(msg);
    }
  };

  const handleDelete = async (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      await api.deletePost(post.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post deleted successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete post';
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  const handleShare = async (e: React.SyntheticEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'LastBench Post',
          text: post.content,
          url,
        });
      } catch {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Post link copied to clipboard!');
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showOptionsMenu]);

  const authorName = post.isAnonymous 
    ? 'Anonymous Student' 
    : post.author?.displayName || post.author?.username || 'Unknown User';

  const authorHandle = post.isAnonymous 
    ? 'anonymous' 
    : post.author?.username;

  const authorInitial = authorName[0]?.toUpperCase() || 'U';

  const formattedTime = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : 'recently';

  const youtubeEmbedUrl = post.linkUrl ? getYouTubeEmbedUrl(post.linkUrl) : null;

  return (
    <>
    <article
      onClick={() => navigate(`/post/${post.id}`)}
      className={`bg-card border border-border rounded-xl transition-all cursor-pointer relative overflow-hidden group hover:border-primary/40 shadow-xs ${
        post.isPinned ? 'border-primary/50' : ''
      } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {post.isPinned && (
        <div className="bg-primary/10 border-b border-primary/20 px-3.5 py-1 text-primary text-xs font-semibold flex items-center gap-1.5">
          <Pin size={12} className="fill-primary" />
          <span>Pinned by Moderators</span>
        </div>
      )}

      <div className="flex p-3 sm:p-4 gap-3">
        {/* LEFT VOTE COLUMN */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="flex flex-col items-center select-none shrink-0"
        >
          <button
            onClick={(e) => handleVote(e, 'UP')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isUpvoted 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title="Upvote"
          >
            <ArrowBigUp size={22} className={isUpvoted ? 'fill-primary' : ''} />
          </button>

          <span className={`text-xs font-black my-0.5 ${
            isUpvoted ? 'text-primary' : isDownvoted ? 'text-destructive' : 'text-foreground'
          }`}>
            {optimisticScore}
          </span>

          <button
            onClick={(e) => handleVote(e, 'DOWN')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isDownvoted 
                ? 'text-destructive bg-destructive/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title="Downvote"
          >
            <ArrowBigDown size={22} className={isDownvoted ? 'fill-destructive' : ''} />
          </button>
        </div>

        {/* MAIN POST BODY */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* HEADER STRIP: Subreddit + User + Time */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {post.community && (
                <Link
                  to={`/g/${post.community.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1 shrink-0"
                >
                  <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
                    g/
                  </span>
                  <span>{post.community.name}</span>
                </Link>
              )}

              <span className="text-muted-foreground">•</span>

              <div className="flex items-center gap-1 text-muted-foreground">
                <span>Posted by</span>
                {post.isAnonymous ? (
                  <span className="font-semibold text-purple-400">Anonymous</span>
                ) : (
                  <Link
                    to={`/u/${authorHandle}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-1"
                  >
                    {post.author?.avatarUrl ? (
                      <img 
                        src={post.author.avatarUrl} 
                        alt={authorName} 
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                        {authorInitial}
                      </span>
                    )}
                    <span>u/{authorHandle}</span>
                  </Link>
                )}
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* OPTIONS MENU */}
            {showMenu && (
              <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="More options"
                >
                  <MoreHorizontal size={16} />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-xl py-1 z-30">
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Delete post</span>
                      </button>
                    )}
                    {canReport && (
                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          toast.info('Report submitted to campus moderators for review');
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Flag size={13} />
                        <span>Report</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TITLE */}
          {post.title && (
            <h2 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
              {post.title}
            </h2>
          )}

          {/* CONTENT */}
          <p className="text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed">
            {renderClickableText(post.content)}
          </p>

          {/* EXTERNAL LINK / YOUTUBE EMBED */}
          {post.linkUrl && (
            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
              {youtubeEmbedUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-black shadow-sm">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>
              ) : (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/70 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ExternalLink size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground group-hover:text-primary truncate">
                        {post.linkUrl}
                      </div>
                      <div className="text-[10px] text-muted-foreground">External Link</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* VIDEO / MEDIA PLAYER (AUTO-PLAY IN VIEWPORT) */}
          {!!post.mediaUrls?.length && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {post.type === 'VIDEO' || isVideoUrl(post.mediaUrls[0] || '') ? (
                <FeedVideoPlayer
                  src={post.mediaUrls[0]!}
                  id={post.id}
                  onFullscreen={() => setShowVideoLightbox(true)}
                />
              ) : (
                // IMAGE GRID — clicking opens the lightbox, NOT a new window
                <div className={`grid gap-1 ${
                  post.mediaUrls.length === 1 ? 'grid-cols-1' :
                  post.mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {post.mediaUrls.map((url, i) => (
                    <div
                      key={i}
                      className={`relative group overflow-hidden rounded cursor-pointer bg-secondary ${
                        post.mediaUrls?.length === 1 ? 'aspect-[16/10] max-h-[32rem]' : 'aspect-[4/3]'
                      }`}
                      onClick={() => setLightboxIndex(i)}
                    >
                      <img
                        src={url}
                        alt={`Post image ${i + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Maximize2 size={20} className="text-white drop-shadow" />
                      </div>
                      {/* Show count badge on last tile if more than 3 */}
                      {post.mediaUrls!.length > 3 && i === 2 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-lg font-bold">+{post.mediaUrls!.length - 3}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POLL */}
          {post.poll && (
            <div className="flex flex-col gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              {post.poll.options.map((option) => {
                const isSelected = post.poll!.userVotedOptionId === option.id;
                
                return (
                  <div
                    key={option.id}
                    onClick={(e) => handlePollVote(e, option.id)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg border relative overflow-hidden text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 font-bold text-foreground'
                        : 'border-border bg-secondary/40 hover:bg-secondary/80 text-foreground'
                    }`}
                  >
                    {post.poll!.totalVotes > 0 && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                          isSelected ? 'bg-primary/20' : 'bg-secondary/60'
                        }`}
                        style={{ width: `${option.percentage}%` }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{option.text}</span>
                        {isSelected && <Check size={14} className="text-primary stroke-[2.5]" />}
                      </div>
                      <span className="text-muted-foreground text-xs font-bold">{option.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="text-xs text-muted-foreground mt-1">
                {post.poll.totalVotes} total votes
              </div>
            </div>
          )}

          {/* ACTION BAR */}
          <div className="flex items-center gap-0.5 mt-1 -ml-1.5">
            <Link 
              to={`/post/${post.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <MessageSquare size={14} />
              <span>{post.commentCount} Comments</span>
            </Link>
            
            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </article>

    {/* IMAGE LIGHTBOX */}
    <AnimatePresence>
      {lightboxIndex !== null && post.mediaUrls && (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaLightbox
            urls={post.mediaUrls}
            initialIndex={lightboxIndex}
            isVideo={false}
            onClose={() => setLightboxIndex(null)}
          />
        </div>
      )}
    </AnimatePresence>

    {/* VIDEO LIGHTBOX */}
    <AnimatePresence>
      {showVideoLightbox && post.mediaUrls && (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaLightbox
            urls={post.mediaUrls}
            initialIndex={0}
            isVideo={true}
            onClose={() => setShowVideoLightbox(false)}
          />
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
