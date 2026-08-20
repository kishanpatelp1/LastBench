import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, MessageSquare, Send, Trash2, Flag, X } from 'lucide-react';
import { cn, timeAgo, formatNumber } from '../../lib/utils';
import { toast } from 'sonner';
import { ReportModal } from '../ReportModal';
import { GifPicker } from './GifPicker';
import type { Comment } from '../../types';

interface CommentThreadProps {
  postId: string;
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

function renderCommentBody(content: string) {
  // Detect markdown images ![alt](url) and standalone GIF / media URLs
  const markdownImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s]+)\)/g;
  const standaloneUrlRegex = /(https?:\/\/[^\s]+(?:\.gif|\.png|\.webp|\.jpg|\.jpeg|giphy\.com\/media\/|tenor\.com\/view\/)[^\s]*)/gi;

  const mediaUrls: string[] = [];
  let text = content;

  // Extract markdown images
  text = text.replace(markdownImgRegex, (_match, _alt, url) => {
    mediaUrls.push(url);
    return '';
  });

  // Extract standalone image URLs
  text = text.replace(standaloneUrlRegex, (url) => {
    if (!mediaUrls.includes(url)) {
      mediaUrls.push(url);
    }
    return '';
  });

  const trimmedText = text.trim();

  return (
    <div className="space-y-2">
      {trimmedText && (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
          {trimmedText}
        </p>
      )}
      {mediaUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {mediaUrls.map((url, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden max-w-xs max-h-60 bg-secondary/80 border border-border shadow-xs"
            >
              <img
                src={url}
                alt="Comment reaction"
                loading="lazy"
                className="w-full h-full object-contain block max-h-56 rounded-lg hover:scale-102 transition-transform"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, postId, depth = 0 }: CommentItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyGif, setReplyGif] = useState<string | null>(null);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isAnonymousReply, setIsAnonymousReply] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const author = comment.author;
  const replies = comment.replies ?? [];
  const canViewProfile = !comment.isAnonymous && author?.id !== 'anonymous' && !!author?.username;
  const profilePath = author?.id === user?.id ? '/profile' : `/u/${author?.username}`;

  const handleCommentDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(comment.id);
      toast.success('Comment deleted');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const handleCommentVote = async (type: 'UP' | 'DOWN') => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      navigate('/login');
      return;
    }
    try {
      await api.voteComment(comment.id, type);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Vote recorded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to vote');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to reply');
      navigate('/login');
      return;
    }

    const trimmedText = replyContent.trim();
    if (!trimmedText && !replyGif) return;

    const finalContent = replyGif
      ? trimmedText
        ? `${trimmedText}\n\n![gif](${replyGif})`
        : `![gif](${replyGif})`
      : trimmedText;

    setIsSubmittingReply(true);
    try {
      await api.createComment({
        postId,
        content: finalContent,
        isAnonymous: isAnonymousReply,
        parentId: comment.id,
      });
      setReplyContent('');
      setReplyGif(null);
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Reply posted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className={cn('group', depth > 0 && 'ml-6 pl-4 border-l-2 border-border')}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1.5">
          {canViewProfile ? (
            <Link to={profilePath} className="flex items-center gap-2 group/author">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 flex items-center justify-center text-white text-[10px] font-bold">
                {author?.displayName?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium text-foreground group-hover/author:text-primary group-hover/author:underline transition-colors">
                {author?.displayName ?? `u/${author?.username}`}
              </span>
            </Link>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 flex items-center justify-center text-white text-[10px] font-bold">
                {author?.displayName?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium text-foreground">
                {comment.isAnonymous ? 'Anonymous' : author?.displayName ?? (author?.username ? `u/${author.username}` : 'Anonymous')}
              </span>
            </>
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>

        {/* Comment Content with GIF Support */}
        <div className="ml-9">
          {renderCommentBody(comment.content)}
        </div>

        <div className="flex items-center gap-3 ml-9 mt-2">
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <button
              type="button"
              onClick={() => handleCommentVote('UP')}
              className="p-1 rounded hover:bg-secondary hover:text-violet-400 transition-colors cursor-pointer"
            >
              <ArrowUp size={14} />
            </button>
            <span className="text-xs font-semibold min-w-[1.5rem] text-center">{formatNumber(comment.score)}</span>
            <button
              type="button"
              onClick={() => handleCommentVote('DOWN')}
              className="p-1 rounded hover:bg-secondary hover:text-red-400 transition-colors cursor-pointer"
            >
              <ArrowDown size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('Please sign in to reply');
                navigate('/login');
                return;
              }
              setIsReplying(!isReplying);
            }}
            className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare size={12} />
            Reply
          </button>
          {(user?.id === author?.id || user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
            <button
              type="button"
              onClick={handleCommentDelete}
              className="text-xs text-muted-foreground hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
          {user?.id !== author?.id && author?.id !== 'anonymous' && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Please sign in to report content');
                  navigate('/login');
                  return;
                }
                setReportModalOpen(true);
              }}
              className="text-xs text-muted-foreground hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Flag size={12} />
              Report
            </button>
          )}
        </div>

        {/* Dedicated Reply Box */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="ml-9 mt-3 rounded-xl border border-primary/30 bg-secondary/40 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-foreground">
                Replying to {comment.isAnonymous ? 'Anonymous' : author?.displayName ?? `u/${author?.username}`}
              </span>
              <button
                type="button"
                onClick={() => setIsReplying(false)}
                className="text-primary hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />

            {/* Selected GIF Preview */}
            {replyGif && (
              <div className="relative inline-block rounded-lg overflow-hidden border border-primary/40 bg-black/40">
                <img src={replyGif} alt="Selected GIF" className="max-h-32 rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={() => setReplyGif(null)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnonymousReply(!isAnonymousReply)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    isAnonymousReply ? 'bg-violet-500/10 text-violet-400' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isAnonymousReply ? '🔒 Anonymous' : '👤 Public'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsGifPickerOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-black text-xs flex items-center gap-1 transition-colors cursor-pointer border border-border"
                  title="Add GIF or Sticker"
                >
                  <span className="bg-primary/20 text-primary px-1 py-0.5 rounded text-[9px] font-black">GIF</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReply || (!replyContent.trim() && !replyGif)}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Send size={13} /> Reply
              </button>
            </div>
          </form>
        )}
        <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} targetId={comment.id} targetType="COMMENT" />
        <GifPicker isOpen={isGifPickerOpen} onClose={() => setIsGifPickerOpen(false)} onSelectGif={(url) => setReplyGif(url)} />
      </div>

      {replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
}

export function CommentThread({ postId }: CommentThreadProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.getComments({ postId }),
  });

  const comments = data?.items ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to comment');
      navigate('/login');
      return;
    }
    const trimmedText = newComment.trim();
    if (!trimmedText && !selectedGif) return;

    const finalContent = selectedGif
      ? trimmedText
        ? `${trimmedText}\n\n![gif](${selectedGif})`
        : `![gif](${selectedGif})`
      : trimmedText;

    setIsSubmitting(true);
    try {
      await api.createComment({
        postId,
        content: finalContent,
        isAnonymous,
      });
      setNewComment('');
      setSelectedGif(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment posted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Comment Input */}
      <div className="p-4 border-b border-border">
        {!isAuthenticated ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Sign in to join the conversation</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold mt-1 shrink-0">
              {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or reaction..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
              />

              {/* Selected GIF Preview */}
              {selectedGif && (
                <div className="relative inline-block rounded-lg overflow-hidden border border-primary/40 bg-black/40">
                  <img src={selectedGif} alt="Selected GIF" className="max-h-36 rounded-lg object-contain" />
                  <button
                    type="button"
                    onClick={() => setSelectedGif(null)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      isAnonymous ? 'bg-violet-500/10 text-violet-400' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {isAnonymous ? '🔒 Anonymous' : '👤 Public'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGifPickerOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-black text-xs flex items-center gap-1 transition-colors cursor-pointer border border-border"
                    title="Add GIF or Sticker"
                  >
                    <span className="bg-primary/20 text-primary px-1 py-0.5 rounded text-[9px] font-black">GIF</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Stickers</span>
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isSubmitting || (!newComment.trim() && !selectedGif)}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Send size={14} />
                  Post
                </motion.button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="skeleton w-7 h-7 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No comments yet. Start the conversation!</p>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postId={postId} />
            ))}
          </div>
        )}
      </div>

      <GifPicker
        isOpen={isGifPickerOpen}
        onClose={() => setIsGifPickerOpen(false)}
        onSelectGif={(url) => setSelectedGif(url)}
      />
    </div>
  );
}
