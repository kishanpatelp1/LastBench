import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, MessageSquare, Send, Trash2, Flag } from 'lucide-react';
import { cn, timeAgo, formatNumber } from '../../lib/utils';
import { toast } from 'sonner';
import { ReportModal } from '../ReportModal';
import type { Comment } from '../../types';

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
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
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createComment({
        postId,
        content: newComment.trim(),
        isAnonymous,
        parentId: replyTo ?? undefined,
      });
      setNewComment('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment posted!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const author = comment.author;
    const replies = comment.replies ?? [];
    const [reportModalOpen, setReportModalOpen] = useState(false);
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
                <span className="text-sm font-medium text-foreground">{comment.isAnonymous ? 'Anonymous' : author?.displayName ?? (author?.username ? `u/${author.username}` : 'Anonymous')}</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed ml-9">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 ml-9 mt-2">
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <button
                onClick={() => handleCommentVote('UP')}
                className="p-1 rounded hover:bg-secondary hover:text-violet-400 transition-colors cursor-pointer"
              >
                <ArrowUp size={14} />
              </button>
              <span className="text-xs font-semibold min-w-[1.5rem] text-center">{formatNumber(comment.score)}</span>
              <button
                onClick={() => handleCommentVote('DOWN')}
                className="p-1 rounded hover:bg-secondary hover:text-red-400 transition-colors cursor-pointer"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Please sign in to reply');
                  navigate('/login');
                  return;
                }
                setNewComment('');
                setReplyTo(comment.id);
              }}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare size={12} />
              Reply
            </button>
            {(user?.id === author?.id || user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <button
                onClick={handleCommentDelete}
                className="text-xs text-muted-foreground hover:text-red-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
            {user?.id !== author?.id && author?.id !== 'anonymous' && (
              <button
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
          {replyTo === comment.id && (
            <form onSubmit={handleSubmit} className="ml-9 mt-3 rounded-xl border border-primary/30 bg-secondary/40 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-foreground">Replying to {comment.isAnonymous ? 'Anonymous' : author?.displayName ?? `u/${author?.username}`}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-primary hover:underline cursor-pointer">Cancel</button>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    isAnonymous ? 'bg-violet-500/10 text-violet-400' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send size={13} /> Reply
                </button>
              </div>
            </form>
          )}
          <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} targetId={comment.id} targetType="COMMENT" />
        </div>

        {replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
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
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold mt-1">
              ?
            </div>
            <div className="flex-1 space-y-3">
              {!replyTo ? (
                <>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    isAnonymous ? 'bg-violet-500/10 text-violet-400' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isAnonymous ? '🔒 Anonymous' : '👤 Public'}
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  Post
                </motion.button>
              </div>
                </>
              ) : (
                <div className="py-2 text-xs text-muted-foreground">
                  Reply editor is open beneath the selected comment. <button onClick={() => setReplyTo(null)} className="text-primary hover:underline cursor-pointer">Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
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
              <CommentItem key={comment.id as string} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
