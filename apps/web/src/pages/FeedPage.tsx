import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api-client';
import { PostCard } from '../components/feed/PostCard';
import { PostComposer } from '../components/feed/PostComposer';
import { FEED_SORT_OPTIONS } from '@lastbench/shared';
import { cn } from '../lib/utils';
import { Flame, Sparkles, Trophy, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth-store';
import { Post } from '../types';

const sortIcons = { hot: Flame, new: Sparkles, top: Trophy };

export function FeedPage() {
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('hot');
  const { user } = useAuthStore();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;
    setIsResending(true);
    try {
      await api.resendVerification(user.email);
      toast.success('Verification email resent!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setIsResending(false);
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feed', sort],
    queryFn: ({ pageParam }) =>
      api.getFeed({ sort, limit: '20', ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const posts = (data?.pages.flatMap((p) => p.items) ?? []) as unknown as Post[];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Verification Banner */}
      {user && user.emailVerified === false && (
        <div className="rounded-xl bg-secondary border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <Mail size={16} />
            Please verify your student email to access all features.
          </p>
          <button 
            onClick={handleResend} 
            disabled={isResending}
            className="text-sm font-medium text-primary hover:underline whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {isResending ? 'Resending...' : 'Resend verification email'}
          </button>
        </div>
      )}

      {/* Composer */}
      <PostComposer />

      {/* Sort Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border">
        {FEED_SORT_OPTIONS.map((option) => {
          const Icon = sortIcons[option.value as keyof typeof sortIcons];
          const isActive = sort === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setSort(option.value as typeof sort)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sort-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 rounded-xl bg-secondary text-foreground font-medium flex items-center gap-2 hover:bg-muted transition-all border border-border cursor-pointer"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </motion.button>
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🫥</p>
          <p className="text-muted-foreground text-lg">No posts yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
