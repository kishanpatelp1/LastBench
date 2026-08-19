import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Flame, Clock, TrendingUp, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { PostCard } from '../components/feed/PostCard';
import { PostComposer } from '../components/feed/PostComposer';

export function FeedPage() {
  const { user } = useAuthStore();
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data: postsData,
    isLoading: isPostsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['feed', sort, timeRange],
    queryFn: ({ pageParam }) => api.getFeed({ sort, timeRange, limit: '10', ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.2 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: communitiesData, isLoading: isCommunitiesLoading } = useQuery({
    queryKey: ['communities', 'top'],
    queryFn: () => api.getCommunities({ limit: '5', sort: 'members' }),
  });

  const posts = postsData?.pages.flatMap((p) => p.items) || [];
  const communities = communitiesData?.items || [];

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      <div className="flex-1 min-w-0 space-y-3">
        {user && !user.emailVerified && (
          <div className="bg-card border border-border rounded-md p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Please verify your email address to interact with posts and groups.</span>
            <button
              onClick={async () => {
                if (!user?.email) return;
                try {
                  await api.resendVerification(user.email);
                  toast.success('Verification email sent to ' + user.email);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : 'Failed to send email');
                }
              }}
              className="text-primary hover:underline font-semibold text-xs shrink-0 cursor-pointer"
            >
              Resend Email
            </button>
          </div>
        )}

        {user && <PostComposer />}

        <div className="flex gap-0 bg-card border border-border rounded-md overflow-hidden w-fit">
          <button
            onClick={() => setSort('hot')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              sort === 'hot'
                ? 'bg-secondary text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Flame size={16} /> Hot
          </button>
          <button
            onClick={() => setSort('new')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              sort === 'new'
                ? 'bg-secondary text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Clock size={16} /> New
          </button>
          <button
            onClick={() => setSort('top')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              sort === 'top'
                ? 'bg-secondary text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <TrendingUp size={16} /> Top
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays size={14} aria-hidden="true" />
          <div className="flex gap-0 border border-border rounded-md overflow-hidden">
            {([
              ['all', 'All time'],
              ['week', 'This week'],
              ['month', 'This month'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeRange(value)}
                className={`px-3 py-1.5 transition-colors cursor-pointer ${
                  timeRange === value
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {isPostsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-md h-28 animate-pulse skeleton" />
            ))
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <div className="text-4xl mb-3">👻</div>
              Nothing here yet. Be the first to post!
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {hasNextPage && (
            <div ref={observerRef} className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span>Loading more campus posts...</span>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden lg:block w-80 flex-shrink-0 space-y-3 sticky top-16 self-start">
        <div className="bg-card border border-border rounded-md p-3">
          <div className="text-sm font-semibold mb-2">Post to LastBench</div>
          <div className="w-full h-px bg-border mb-3" />
          <Link
            to="/groups"
            className="block w-full mb-2 py-1.5 text-sm text-center text-primary font-semibold border border-primary rounded-md hover:bg-primary/5 transition-colors"
          >
            Explore Groups
          </Link>
        </div>

        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <span className="text-sm font-semibold">Top Groups</span>
          </div>
          <div className="divide-y divide-border">
            {isCommunitiesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-7 h-7 bg-muted rounded-md animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                    <div className="w-12 h-2 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              communities.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/g/${c.slug}`}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary transition-colors"
                >
                  <span className="text-xs text-muted-foreground font-bold w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">g/{c.slug}</div>
                    <div className="text-[10px] text-muted-foreground">{c.memberCount} members</div>
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground" />
                </Link>
              ))
            )}
          </div>
          <Link
            to="/groups"
            className="block px-3 py-2 text-xs text-primary hover:bg-secondary transition-colors text-center border-t border-border"
          >
            View all groups
          </Link>
        </div>

        <div className="bg-card border border-border rounded-md p-3">
          <div className="text-sm font-semibold mb-1.5">About LastBench</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The campus community for students to share, discuss, and connect — anonymously or openly.
          </p>
          <div className="mt-3 pt-3 border-t border-border flex gap-3 text-[10px] text-muted-foreground">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
