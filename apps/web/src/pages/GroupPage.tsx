import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { PostCard } from '../components/feed/PostCard';
import { motion } from 'framer-motion';
import { Users, Calendar } from 'lucide-react';
import { formatNumber, timeAgo } from '../lib/utils';
import { toast } from 'sonner';
import { Community, Post } from '../types';
import { useAuthStore } from '../stores/auth-store';

export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: community, isLoading: loadingCommunity } = useQuery<Community>({
    queryKey: ['community', slug],
    queryFn: () => api.getCommunity(slug!) as unknown as Promise<Community>,
    enabled: !!slug,
  });

  const { data: postsData, isLoading: loadingPosts } = useInfiniteQuery({
    queryKey: ['feed', 'community', community?.id],
    queryFn: ({ pageParam }) =>
      api.getFeed({ sort: 'new', communityId: community?.id as string, limit: '20', ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!community?.id,
  });

  const posts = (postsData?.pages.flatMap((p) => p.items) ?? []) as unknown as Post[];

  if (loadingCommunity) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="skeleton h-56 rounded-2xl bg-card border border-border" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 rounded-2xl bg-card border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <p className="text-5xl mb-2">🔍</p>
        <h2 className="text-xl font-bold text-foreground">Group not found</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The community /g/{slug} doesn&apos;t exist on campus yet or may have been removed.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/groups"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer"
          >
            Explore All Groups
          </Link>
        </div>
      </div>
    );
  }

  const handleJoinToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to join groups');
      navigate('/login');
      return;
    }
    
    // Optimistic UI update
    const previousCommunity = queryClient.getQueryData(['community', slug]);
    const isCurrentlyMember = community.isMember;
    
    queryClient.setQueryData(['community', slug], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        isMember: !isCurrentlyMember,
        memberCount: isCurrentlyMember ? old.memberCount - 1 : old.memberCount + 1,
      };
    });

    try {
      if (isCurrentlyMember) {
        await api.leaveCommunity(community.id);
        toast.success('Left group');
      } else {
        await api.joinCommunity(community.id);
        toast.success('Joined group! 🎉');
      }
    } catch (err) {
      toast.error(isCurrentlyMember ? 'Failed to leave' : 'Failed to join');
      // Revert optimistic update
      queryClient.setQueryData(['community', slug], previousCommunity);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Group Header */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        <div className="p-5 -mt-8">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-card">
                {community.name?.[0]}
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-foreground">{community.name}</h1>
                <p className="text-sm text-muted-foreground">/g/{community.slug}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinToggle}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                community.isMember 
                  ? 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg hover:shadow-violet-500/25'
              }`}
            >
              {community.isMember ? 'Joined' : 'Join'}
            </motion.button>
          </div>

          {community.description && (
            <p className="text-sm text-muted-foreground mt-4">{community.description}</p>
          )}

          <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users size={14} />{formatNumber(community.memberCount)} members</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} />Created {timeAgo(community.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loadingPosts ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12"><p className="text-muted-foreground">No posts in this group yet.</p></div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}
