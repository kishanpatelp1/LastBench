import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, MoreHorizontal, Pin, Trash2, Check, ExternalLink, Flag, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Post } from '../../types';
import { useAuthStore } from '../../stores/auth-store';
import { api } from '../../lib/api-client';
import { MediaLightbox } from './MediaLightbox';

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

  const currentVote = post.userVote;
  const isUpvoted = currentVote === 'UP';
  const isDownvoted = currentVote === 'DOWN';

  const handleVote = async (e: React.MouseEvent, type: 'UP' | 'DOWN') => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      navigate('/login');
      return;
    }

    try {
      await api.votePost(post.id, type);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handlePollVote = async (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in');
      navigate('/login');
      return;
    }

    try {
      await api.votePoll(post.id, optionId);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update poll vote');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptionsMenu(false);
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      await api.deletePost(post.id);
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title || 'LastBench Post', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOptionsMenu]);

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptionsMenu(false);
    const reason = window.prompt('Why are you reporting this post? (optional)');
    if (reason === null) return; // cancelled
    try {
      await api.reportPost(post.id, reason || 'Inappropriate content');
      toast.success('Post reported. Our moderators will review it shortly.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to report post');
    }
  };

  const embeddedYouTubeUrl = post.linkUrl ? getYouTubeEmbedUrl(post.linkUrl) : null;

  return (
    <>
    <article 
      onClick={() => navigate(`/post/${post.id}`)}
      className="bg-card border border-border rounded-md hover:border-muted-foreground/30 transition-colors cursor-pointer flex text-card-foreground relative"
    >
      {/* VOTE SIDEBAR */}
      <div className="flex flex-col items-center py-2 px-1.5 bg-secondary/30 rounded-l-md border-r border-border shrink-0 select-none">
        <button
          onClick={(e) => handleVote(e, 'UP')}
          className={`p-1 rounded hover:bg-secondary transition-colors cursor-pointer ${
            isUpvoted ? 'text-orange-500' : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Upvote"
        >
          <ArrowBigUp size={22} className={isUpvoted ? 'fill-orange-500' : ''} />
        </button>

        <span className={`text-xs font-bold my-0.5 ${
          isUpvoted ? 'text-orange-500' : isDownvoted ? 'text-indigo-500' : 'text-foreground'
        }`}>
          {post.score}
        </span>

        <button
          onClick={(e) => handleVote(e, 'DOWN')}
          className={`p-1 rounded hover:bg-secondary transition-colors cursor-pointer ${
            isDownvoted ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Downvote"
        >
          <ArrowBigDown size={22} className={isDownvoted ? 'fill-indigo-500' : ''} />
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* HEADER META */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {post.community && (
                <>
                  <Link 
                    to={`/g/${post.community.slug}`} 
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-foreground hover:underline truncate"
                  >
                    g/{post.community.slug}
                  </Link>
                  <span>•</span>
                </>
              )}
              
              <span>Posted by</span>
              {post.isAnonymous ? (
                <span className="italic">u/Anonymous</span>
              ) : (
                <Link 
                  to={user?.id === post.author?.id ? '/profile' : `/u/${post.author?.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary font-medium"
                >
                  u/{post.author?.username || 'user'}
                </Link>
              )}
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.isPinned && (
                <>
                  <span>•</span>
                  <Pin size={10} className="text-primary" />
                </>
              )}
            </div>

            {/* OPTIONS MENU */}
            {showMenu && (
              <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Post options"
                >
                  <MoreHorizontal size={16} />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-30 py-1">
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Trash2 size={12} />
                        <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                      </button>
                    )}
                    {canReport && (
                      <button
                        onClick={handleReport}
                        className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Flag size={12} />
                        <span>Report Post</span>
                      </button>
                    )}
                    {isAdminOrMod && !isAuthor && (
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Trash2 size={12} />
                        <span>Remove Post</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TITLE */}
          {post.title && (
            <Link 
              to={`/post/${post.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-bold text-foreground hover:text-primary leading-snug line-clamp-2"
            >
              {post.title}
            </Link>
          )}

          {/* CONTENT WITH CLICKABLE LINKS */}
          {(!post.title || post.content) && (
            <div className="text-sm text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {renderClickableText(post.content)}
            </div>
          )}

          {/* LINK EMBED CARD */}
          {post.linkUrl && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {embeddedYouTubeUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black shadow-sm">
                  <iframe
                    src={embeddedYouTubeUrl}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ExternalLink size={16} />
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

          {/* VIDEO / MEDIA PLAYER */}
          {!!post.mediaUrls?.length && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {post.type === 'VIDEO' || isVideoUrl(post.mediaUrls[0] || '') ? (
                <div className="rounded-lg overflow-hidden bg-black border border-border shadow-sm relative group">
                  <video
                    src={post.mediaUrls[0]}
                    controls
                    preload="metadata"
                    className="w-full max-h-72 object-contain"
                  />
                  <button
                    onClick={() => setShowVideoLightbox(true)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
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
                        post.mediaUrls?.length === 1 ? 'max-h-72' : 'h-32'
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

    {/* VIDEO LIGHTBOX */}
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
    </>
  );
}
