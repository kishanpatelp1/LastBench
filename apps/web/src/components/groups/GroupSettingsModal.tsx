import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Upload, Shield, ShieldOff, UserMinus, Crown, Loader2, Camera, Save, Trash2, Maximize2 } from 'lucide-react';

import { api } from '../../lib/api-client';
import { Community, CommunityMember } from '../../types';
import { useAuthStore } from '../../stores/auth-store';
import { MediaLightbox } from '../feed/MediaLightbox';

interface GroupSettingsModalProps {
  community: Community;
  onClose: () => void;
}

type Tab = 'general' | 'members';

export function GroupSettingsModal({ community, onClose }: GroupSettingsModalProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Form state
  const [description, setDescription] = useState(community.description ?? '');
  const [avatarUrl, setAvatarUrl] = useState(community.avatarUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(community.bannerUrl ?? '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Members pagination state
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMoreMembers, setHasMoreMembers] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isFetchingMoreMembers, setIsFetchingMoreMembers] = useState(false);

  const isOwner = community.userRole === 'OWNER';
  const isMod = community.userRole === 'MOD';
  const isSystemAdmin = user?.role === 'ADMIN';
  const canDeleteGroup = isOwner || isSystemAdmin;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Initial members load
  useEffect(() => {
    if (activeTab !== 'members') return;
    setIsMembersLoading(true);
    api.getCommunityMembers(community.slug, { limit: '20' })
      .then((res) => {
        setMembers((res.items || []));
        setNextCursor(res.nextCursor);
        setHasMoreMembers(!!res.hasMore);
      })
      .catch(() => toast.error('Failed to load members'))
      .finally(() => setIsMembersLoading(false));
  }, [activeTab, community.slug]);

  // Fetch next page of members
  const fetchMoreMembers = async () => {
    if (!nextCursor || isFetchingMoreMembers) return;
    setIsFetchingMoreMembers(true);
    try {
      const res = await api.getCommunityMembers(community.slug, { cursor: nextCursor, limit: '20' });
      setMembers((prev) => [...prev, ...(res.items || [])]);
      setNextCursor(res.nextCursor);
      setHasMoreMembers(!!res.hasMore);
    } catch {
      toast.error('Failed to load more members');
    } finally {
      setIsFetchingMoreMembers(false);
    }
  };

  const handleImageUpload = async (
    files: FileList | null,
    type: 'avatar' | 'banner',
  ) => {
    const file = files?.[0];
    if (!file) return;

    const setLoading = type === 'avatar' ? setIsUploadingAvatar : setIsUploadingBanner;
    const setUrl = type === 'avatar' ? setAvatarUrl : setBannerUrl;

    setLoading(true);
    try {
      const result = await api.uploadFile(file);
      setUrl(result.url);
      toast.success(`${type === 'avatar' ? 'Group avatar' : 'Banner'} uploaded!`);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateCommunity(community.slug, {
        description: description || undefined,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
      });
      queryClient.invalidateQueries({ queryKey: ['community', community.slug] });
      toast.success('Group settings saved!');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmSlug = prompt(`To delete this group, please type "delete g/${community.slug}" below:`);
    if (confirmSlug !== `delete g/${community.slug}`) {
      if (confirmSlug !== null) toast.error('Confirmation text did not match.');
      return;
    }

    setIsDeletingGroup(true);
    try {
      await api.deleteCommunity(community.slug);
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success(`Group g/${community.slug} has been deleted.`);
      onClose();
      navigate('/groups');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete group';
      toast.error(msg);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handlePromoteMod = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'MOD' ? 'MEMBER' : 'MOD';
    try {
      await api.updateMemberRole(community.slug, memberId, newRole as 'MOD' | 'MEMBER');
      setMembers((prev) =>
        prev.map((m) => m.user.id === memberId ? { ...m, role: newRole as CommunityMember['role'] } : m)
      );
      toast.success(`Member ${newRole === 'MOD' ? 'promoted to moderator' : 'demoted to member'}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleKick = async (memberId: string, username: string) => {
    if (!confirm(`Remove u/${username} from this group?`)) return;
    try {
      await api.removeCommunityMember(community.slug, memberId);
      setMembers((prev) => prev.filter((m) => m.user.id !== memberId));
      toast.success(`u/${username} has been removed`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleTransferOwnership = async (memberId: string, username: string) => {
    if (!confirm(`Transfer ownership to u/${username}? You will become a moderator.`)) return;
    try {
      await api.transferOwnership(community.slug, memberId);
      queryClient.invalidateQueries({ queryKey: ['community', community.slug] });
      toast.success(`Ownership transferred to u/${username}`);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to transfer ownership');
    }
  };

  const getRoleBadge = (role: CommunityMember['role']) => {
    if (role === 'OWNER') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Owner</span>;
    if (role === 'MOD') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">Mod</span>;
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base text-foreground">g/{community.slug} Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {((community.slug === 'general' ? ['general'] : ['general', 'members']) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="p-5 space-y-5">
              {/* Banner upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Banner Image</label>
                <div
                  className="h-24 rounded-lg overflow-hidden border border-border relative"
                  style={{
                    background: bannerUrl
                      ? `url(${bannerUrl}) center/cover no-repeat`
                      : 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))',
                  }}
                >
                  <div className="absolute right-2 top-2 flex gap-1">
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(bannerUrl)}
                        className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                        title="View banner full size"
                      >
                        <Maximize2 size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 disabled:opacity-60 transition-colors cursor-pointer"
                      title="Change banner"
                    >
                      {isUploadingBanner ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    </button>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="p-1.5 rounded-md bg-black/60 text-white hover:bg-destructive transition-colors cursor-pointer"
                        title="Remove banner and restore default"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <input id="group-banner-file-input" name="bannerInput" aria-label="Upload group banner image" ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, 'banner')} />
              </div>

              {/* Avatar upload */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Group Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border relative group shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Group avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                        {community.name[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 group-hover:bg-black/50 transition-all">
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(avatarUrl)}
                          className="p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all cursor-pointer"
                          title="View avatar full size"
                        >
                          <Maximize2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 disabled:opacity-60 transition-all cursor-pointer"
                        title="Change group avatar"
                      >
                        {isUploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                          title="Remove avatar and restore default"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Use the controls on the image to view, change, or restore the default.</p>
                    <p>Recommended: 256×256px, PNG or JPG</p>
                  </div>
                </div>
                <input id="group-avatar-file-input" name="avatarInput" aria-label="Upload group avatar image" ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, 'avatar')} />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="group-description-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Description</label>
                <textarea
                  id="group-description-input"
                  name="description"
                  aria-label="Group description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell members what this group is about..."
                  maxLength={500}
                  rows={4}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="text-right text-[10px] text-muted-foreground mt-1">{description.length}/500</div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>

              {/* Danger Zone: Delete Group */}
              {canDeleteGroup && (
                <div className="pt-4 border-t border-destructive/20 space-y-2">
                  <label className="text-xs font-bold text-destructive uppercase tracking-wide block">Danger Zone</label>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-foreground">Delete this Group</div>
                      <div className="text-[11px] text-muted-foreground">Permanently delete g/{community.slug} and all its posts.</div>
                    </div>
                    <button
                      onClick={handleDeleteGroup}
                      disabled={isDeletingGroup}
                      className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-semibold hover:bg-destructive/90 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingGroup ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-5 space-y-4">
              {isMembersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const isCurrentUser = member.user?.id === user?.id;
                      const canManage = isOwner || isSystemAdmin || (isMod && member.role === 'MEMBER');

                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border hover:border-border/80">
                          <button
                            type="button"
                            onClick={() => navigate(member.user.id === user?.id ? '/profile' : `/u/${member.user.username}`)}
                            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden hover:ring-2 hover:ring-primary/50 transition-shadow cursor-pointer"
                            title={`View u/${member.user.username}'s profile`}
                          >
                            {member.user?.avatarUrl ? (
                              <img src={member.user.avatarUrl} alt={member.user.username} className="w-full h-full object-cover" />
                            ) : (
                              (member.user?.displayName?.[0] || member.user?.username?.[0] || 'U').toUpperCase()
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(member.user.id === user?.id ? '/profile' : `/u/${member.user.username}`)}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                            title={`View u/${member.user.username}'s profile`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground hover:text-primary hover:underline">u/{member.user?.username}</span>
                              {getRoleBadge(member.role)}
                              {isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
                            </div>
                            {(member.user?.branch || member.user?.year) && (
                              <div className="text-xs text-muted-foreground">
                                {member.user.branch}{member.user.branch && member.user.year ? ' • ' : ''}{member.user.year ? `Year ${member.user.year}` : ''}
                              </div>
                            )}
                          </button>

                          {canManage && !isCurrentUser && member.role !== 'OWNER' && (
                            <div className="flex items-center gap-1 shrink-0">
                              {isOwner && (
                                <>
                                  <button
                                    onClick={() => handlePromoteMod(member.user.id, member.role)}
                                    title={member.role === 'MOD' ? 'Remove mod' : 'Make moderator'}
                                    className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                                  >
                                    {member.role === 'MOD' ? <ShieldOff size={14} /> : <Shield size={14} />}
                                  </button>
                                  <button
                                    onClick={() => handleTransferOwnership(member.user.id, member.user.username)}
                                    title="Transfer ownership"
                                    className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 cursor-pointer transition-colors"
                                  >
                                    <Crown size={14} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleKick(member.user.id, member.user.username)}
                                title="Remove from group"
                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {hasMoreMembers && (
                    <button
                      onClick={fetchMoreMembers}
                      disabled={isFetchingMoreMembers}
                      className="w-full py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isFetchingMoreMembers ? <Loader2 size={13} className="animate-spin" /> : null}
                      {isFetchingMoreMembers ? 'Loading...' : 'Load More Members'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {previewUrl && <MediaLightbox urls={[previewUrl]} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
