import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');

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

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['community', 'members', community?.id],
    queryFn: () => api.getCommunityMembers(community?.id as string),
    enabled: !!community?.id && activeTab === 'members',
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

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-card text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-card text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users size={15} />
          Members
          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{formatNumber(community.memberCount)}</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'posts' ? (
        loadingPosts ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12"><p className="text-muted-foreground">No posts in this group yet.</p></div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )
      ) : loadingMembers ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl bg-card border border-border" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border p-8">
          <Users size={36} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No members found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m: any) => {
            const u = m.user || {};
            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-card border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {u.displayName?.[0]?.toUpperCase() ?? u.username?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {u.displayName || u.username || 'Campus Student'}
                      </span>
                      {u.username && <span className="text-xs text-muted-foreground font-medium">u/{u.username}</span>}
                      {(u.role === 'ADMIN' || u.role === 'MODERATOR') && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                          {u.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{u.branch || 'Student'}{u.year ? ` • Year ${u.year}` : ''}</span>
                      <span>•</span>
                      <span>Joined {timeAgo(m.joinedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
