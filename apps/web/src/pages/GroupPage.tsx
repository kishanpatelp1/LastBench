import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Calendar, Settings, Crown, Shield, SortAsc } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { PostCard } from '../components/feed/PostCard';
import { PostComposer } from '../components/feed/PostComposer';
import { GroupSettingsModal } from '../components/groups/GroupSettingsModal';
import { Community, CommunityMember } from '../types';

type Tab = 'POSTS' | 'MEMBERS';
type SortOption = 'hot' | 'new' | 'top';

export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('POSTS');
  const [sort, setSort] = useState<SortOption>('hot');
  const [showSettings, setShowSettings] = useState(false);

  const { data: community, isLoading: isCommunityLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api.getCommunity(slug!),
    enabled: !!slug,
  });

  const {
    data: postsData,
    isLoading: isPostsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed', community?.id, sort],
    queryFn: ({ pageParam }) =>
      api.getFeed({ communityId: community!.id, sort, ...(pageParam ? { cursor: pageParam } : {}), limit: '15' }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!community?.id,
  });

  const {
    data: membersData,
    isLoading: isMembersLoading,
    fetchNextPage: fetchNextMembersPage,
    hasNextPage: hasNextMembersPage,
    isFetchingNextPage: isFetchingNextMembersPage,
  } = useInfiniteQuery({
    queryKey: ['community', slug, 'members'],
    queryFn: ({ pageParam }) =>
      api.getCommunityMembers(slug!, { limit: '20', ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!slug && activeTab === 'MEMBERS',
  });

  const posts = postsData?.pages.flatMap((p) => p.items) ?? [];
  const members = membersData?.pages.flatMap((p) => (p.items || []) as unknown as CommunityMember[]) ?? [];
  const isMember = community?.isMember ?? false;
  const isSystemAdmin = user?.role === 'ADMIN';
  const isAdmin = community?.userRole === 'OWNER' || community?.userRole === 'MOD' || isSystemAdmin;

  const [isJoining, setIsJoining] = useState(false);

  const toggleMembership = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to join groups');
      return;
    }
    if (!community || isJoining) return;

    setIsJoining(true);
    try {
      if (isMember) {
        await api.leaveCommunity(community.id);
        toast.success(`Left ${community.name}`);
      } else {
        await api.joinCommunity(community.id);
        toast.success(`Joined ${community.name}!`);
      }
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update membership';
      toast.error(msg);
    } finally {
      setIsJoining(false);
    }
  };

  if (isCommunityLoading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-8 space-y-3">
        <div className="bg-card border border-border rounded-md h-32 animate-pulse" />
        <div className="bg-card border border-border rounded-md h-64 animate-pulse" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">Group Not Found</h2>
        <p className="text-muted-foreground mb-4 text-sm">No group exists at g/{slug}</p>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline text-sm">
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      {/* ─── MAIN COLUMN ───────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">

        {/* Group Header Card */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          {/* Banner */}
          <div
            className="h-20 relative"
            style={{
              background: community.bannerUrl
                ? `url(${community.bannerUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, hsl(var(--primary)/0.25) 0%, hsl(var(--primary)/0.05) 100%)',
            }}
          />

          <div className="px-4 pb-3 -mt-6 flex items-end gap-3">
            {/* Group avatar */}
            <div className="w-14 h-14 rounded-lg border-2 border-card shadow-sm overflow-hidden shrink-0 bg-primary">
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {community.name[0]}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-6">
              <h1 className="text-lg font-bold text-foreground leading-tight">{community.name}</h1>
              <p className="text-xs text-muted-foreground font-medium">g/{community.slug}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-6">
              {isAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Group settings"
                >
                  <Settings size={15} />
                </button>
              )}
              <button
                onClick={toggleMembership}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                  isMember
                    ? 'border-border text-foreground hover:bg-secondary hover:text-destructive hover:border-destructive/50'
                    : 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90'
                }`}
              >
                {isMember ? 'Joined ✓' : 'Join'}
              </button>
            </div>
          </div>

          {/* Category / meta strip */}
          {community.category && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <span className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                {community.category}
              </span>
              {community.userRole === 'OWNER' && (
                <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown size={10} /> Owner
                </span>
              )}
              {community.userRole === 'MOD' && (
                <span className="text-xs bg-primary/10 border border-primary/30 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield size={10} /> Moderator
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tab bar + Sort */}
        <div className="flex items-center justify-between">
          <div className="flex bg-card border border-border rounded-md overflow-hidden">
            {(['POSTS', 'MEMBERS'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer capitalize ${
                  activeTab === tab
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {tab === 'POSTS' ? 'Posts' : `Members (${community.memberCount})`}
              </button>
            ))}
          </div>

          {activeTab === 'POSTS' && (
            <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
              <SortAsc size={13} className="text-muted-foreground ml-1.5" />
              {(['hot', 'new', 'top'] as SortOption[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer capitalize ${
                    sort === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Posts tab */}
        {activeTab === 'POSTS' && (
          <div className="space-y-2">
            {isMember && isAuthenticated && (
              <PostComposer communityId={community.id} />
            )}
            {!isMember && isAuthenticated && (
              <div className="bg-card border border-border rounded-md px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
                <span>Join this group to post and comment</span>
                <button onClick={toggleMembership} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                  Join now →
                </button>
              </div>
            )}

            {isPostsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-md h-28 animate-pulse" />
                ))
              : posts.length === 0
              ? (
                <div className="bg-card border border-border rounded-md py-16 flex flex-col items-center gap-2 text-muted-foreground">
                  <p className="text-sm font-medium">No posts yet</p>
                  <p className="text-xs">Be the first to share something in {community.name}!</p>
                </div>
              )
              : posts.map((post) => <PostCard key={post.id} post={post} />)
            }

            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-2.5 bg-card border border-border text-sm font-medium text-foreground rounded-md hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more posts'}
              </button>
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'MEMBERS' && (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            {isMembersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-secondary rounded w-1/3" />
                    <div className="h-2.5 bg-secondary rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No members yet</div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {member.user?.avatarUrl ? (
                      <img src={member.user.avatarUrl} alt={member.user.username} className="w-full h-full object-cover" />
                    ) : (
                      (member.user?.displayName?.[0] || member.user?.username?.[0] || 'U').toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {member.user.displayName || member.user.username}
                      </span>
                      <span className="text-xs text-muted-foreground">u/{member.user.username}</span>
                      {/* Role badges */}
                      {member.role === 'OWNER' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                          <Crown size={9} /> Owner
                        </span>
                      )}
                      {member.role === 'MOD' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 flex items-center gap-0.5">
                          <Shield size={9} /> Mod
                        </span>
                      )}
                    </div>
                    {(member.user.branch || member.user.year) && (
                      <p className="text-xs text-muted-foreground">
                        {member.user.branch}{member.user.branch && member.user.year ? ' · ' : ''}{member.user.year ? `Year ${member.user.year}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {hasNextMembersPage && (
              <div className="p-3 border-t border-border bg-secondary/20 text-center">
                <button
                  onClick={() => fetchNextMembersPage()}
                  disabled={isFetchingNextMembersPage}
                  className="w-full py-2 bg-card border border-border text-xs font-semibold text-foreground rounded-md hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isFetchingNextMembersPage ? 'Loading...' : 'Load More Members'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SIDEBAR ─────────────────────────────────────── */}
      <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-16 self-start space-y-3">
        {/* About */}
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border font-semibold text-sm">About g/{community.slug}</div>
          <div className="p-3 space-y-3">
            {community.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{community.description}</p>
            )}

            <div className="flex gap-4 text-center">
              <div className="flex-1">
                <div className="text-base font-bold text-foreground">{community.memberCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Users size={11} /> Members
                </div>
              </div>
              <div className="w-px bg-border" />
              <div className="flex-1">
                <div className="text-base font-bold text-foreground">
                  {new Date(community.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Calendar size={11} /> Created
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border" />

            {isAuthenticated ? (
              <button
                onClick={toggleMembership}
                className={`w-full py-2 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                  isMember
                    ? 'border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40'
                    : 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90'
                }`}
              >
                {isMember ? 'Leave Group' : 'Join Group'}
              </button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Sign in to join and post</p>
            )}
          </div>
        </div>

        {/* Rules */}
        {community.rules && community.rules.length > 0 && (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border font-semibold text-sm">Group Rules</div>
            <div className="divide-y divide-border">
              {community.rules.map((rule, idx) => (
                <div key={rule.id} className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-foreground">{idx + 1}. {rule.title}</p>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rule.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Panel shortcut */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-md p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin Tools</p>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-colors cursor-pointer"
            >
              <Settings size={14} />
              Group Settings
            </button>
          </div>
        )}
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <GroupSettingsModal
          community={community as unknown as Community}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
