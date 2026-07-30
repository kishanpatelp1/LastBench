import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, MessageSquare, Share2, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { cn, timeAgo, formatNumber } from '../../lib/utils';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Post } from '../../types';
import { ReportModal } from '../ReportModal';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [optimisticScore, setOptimisticScore] = useState(post.score);
  const [optimisticVote, setOptimisticVote] = useState(post.userVote);
  const [showMenu, setShowMenu] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deletePost(post.id);
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (window.location.pathname.startsWith('/post/')) {
        navigate('/feed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const author = post.author;
  const community = post.community;
  const tags = post.tags ?? [];
  const poll = post.poll;

  const [pollVoteId, setPollVoteId] = useState<string | null>(poll?.userVotedOptionId ?? null);
  const [pollOptionsState, setPollOptionsState] = useState(poll?.options ?? []);
  const [totalPollVotes, setTotalPollVotes] = useState(poll?.totalVotes ?? 0);

  useEffect(() => {
    setPollVoteId(post.poll?.userVotedOptionId ?? null);
    setPollOptionsState(post.poll?.options ?? []);
    setTotalPollVotes(post.poll?.totalVotes ?? 0);
  }, [post.poll]);

  const handlePollVote = async (optionId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to vote on polls');
      navigate('/login');
      return;
    }
    if (pollVoteId) return;

    const prevVoteId = pollVoteId;
    const prevOptions = pollOptionsState;
    const prevTotal = totalPollVotes;

    const nextTotal = prevTotal + 1;
    const nextOptions = prevOptions.map((o) => {
      const voteCount = o.id === optionId ? o.voteCount + 1 : o.voteCount;
      return {
        ...o,
        voteCount,
        percentage: nextTotal > 0 ? Math.round((voteCount / nextTotal) * 100) : 0,
      };
    });

    setPollVoteId(optionId);
    setPollOptionsState(nextOptions);
    setTotalPollVotes(nextTotal);

    try {
      await api.votePoll(post.id, optionId);
      toast.success('Vote recorded! 🗳️');
    } catch (err) {
      setPollVoteId(prevVoteId);
      setPollOptionsState(prevOptions);
      setTotalPollVotes(prevTotal);
      toast.error(err instanceof Error ? err.message : 'Failed to cast poll vote');
    }
  };

  const handleVote = async (type: 'UP' | 'DOWN') => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      navigate('/login');
      return;
    }

    const prevScore = optimisticScore;
    const prevVote = optimisticVote;

    // Optimistic update
    if (optimisticVote === type) {
      setOptimisticScore(prevScore + (type === 'UP' ? -1 : 1));
      setOptimisticVote(null);
    } else if (optimisticVote) {
      setOptimisticScore(prevScore + (type === 'UP' ? 2 : -2));
      setOptimisticVote(type);
    } else {
      setOptimisticScore(prevScore + (type === 'UP' ? 1 : -1));
      setOptimisticVote(type);
    }

    try {
      const result = await api.votePost(post.id, type);
      setOptimisticScore(result.score);
    } catch {
      setOptimisticScore(prevScore);
      setOptimisticVote(prevVote);
      toast.error('Failed to vote');
    }
  };

  return (
    <article className="group rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/10">
              {author.displayName?.[0]?.toUpperCase() ?? author.username[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {author.displayName ?? author.username}
                </span>
                {post.isAnonymous && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-semibold uppercase tracking-wider">
                    Anon
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link to={`/g/${community.slug}`} className="hover:text-primary transition-colors font-medium">
                  {community.name}
                </Link>
                <span>•</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors cursor-pointer">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-44 py-1.5 rounded-xl border border-border bg-card shadow-xl text-sm overflow-hidden">
                {(user?.id === author?.id || user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>Delete Post</span>
                  </button>
                )}
                {user?.id !== author?.id && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (!isAuthenticated) { toast.error('Please login to report content'); navigate('/login'); return; }
                      setReportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted-foreground hover:text-red-400 hover:bg-secondary transition-colors text-left cursor-pointer"
                  >
                    <Flag size={15} />
                    <span>Report Post</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                    toast.success('Link copied!');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>Copy Link</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <Link to={`/post/${post.id}`}>
            <h3 className="text-lg font-bold text-foreground mb-2 hover:text-primary transition-colors">
              {post.title}
            </h3>
          </Link>
        )}

        {/* Content */}
        <Link to={`/post/${post.id}`}>
          <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
            {post.content}
          </p>
        </Link>

        {/* Images */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <Link to={`/post/${post.id}`} className="mt-3 block">
            <div className="grid gap-2" style={{ gridTemplateColumns: post.mediaUrls.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              {post.mediaUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="rounded-lg object-cover w-full h-48 hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          </Link>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {/* Poll */}
        {poll && (
          <div className="mt-4 space-y-2.5">
            {pollOptionsState.map((option) => {
              const isSelected = option.id === pollVoteId;
              const hasVoted = pollVoteId !== null;

              return (
                <button
                  key={option.id}
                  disabled={hasVoted}
                  onClick={() => handlePollVote(option.id)}
                  className={cn(
                    "w-full text-left relative overflow-hidden rounded-xl border transition-all duration-200 block",
                    hasVoted ? "cursor-default" : "cursor-pointer hover:border-primary/50 hover:bg-secondary/30",
                    isSelected ? "border-primary bg-primary/5 shadow-sm font-semibold text-primary" : "border-border bg-card text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500",
                      isSelected && "bg-primary/20"
                    )}
                    style={{ width: hasVoted ? `${option.percentage}%` : '0%' }}
                  />
                  <div className="relative px-4 py-3 flex items-center justify-between z-10">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {option.text}
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-lastbench" />}
                    </span>
                    {hasVoted && (
                      <span className="text-xs text-muted-foreground font-bold">
                        {option.percentage}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground">{totalPollVotes} votes</p>
          </div>
        )}        {/* Actions */}
        <div className="flex items-center gap-1 mt-4 -ml-2">
          {/* Vote */}
          <div className="flex items-center rounded-xl bg-secondary border border-border">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => handleVote('UP')}
              className={cn(
                'p-2 rounded-l-xl transition-colors cursor-pointer',
                optimisticVote === 'UP' ? 'text-violet-400 bg-violet-500/10' : 'text-muted-foreground hover:text-violet-400'
              )}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </motion.button>
            <span className={cn(
              'px-2 text-sm font-bold min-w-[2rem] text-center',
              optimisticScore > 0 ? 'text-violet-400' : optimisticScore < 0 ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {formatNumber(optimisticScore)}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => handleVote('DOWN')}
              className={cn(
                'p-2 rounded-r-xl transition-colors cursor-pointer',
                optimisticVote === 'DOWN' ? 'text-red-400 bg-red-500/10' : 'text-muted-foreground hover:text-red-400'
              )}
            >
              <ArrowDown size={18} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Comments */}
          <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-sm">
            <MessageSquare size={16} />
            <span className="font-medium">{post.commentCount}</span>
          </Link>

          {/* Share */}
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); toast.success('Link copied!'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-sm cursor-pointer"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} targetId={post.id} targetType="POST" />
    </article>
  );
}
