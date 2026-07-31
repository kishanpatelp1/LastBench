import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Search, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { Community } from '../types';
import { toast } from 'sonner';

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Please enter a group name and handle');
      return;
    }

    setIsSubmitting(true);
    try {
      const newGroup = await api.createCommunity({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        category,
      });

      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(`Group g/${newGroup.slug} created! 🎉`);
      onClose();
      navigate(`/g/${newGroup.slug}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="text-base font-bold text-foreground">Create Campus Group</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Group Name</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Robotics & AI Club"
              required
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Group Handle (URL)</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs text-muted-foreground font-semibold">g/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="robotics"
                required
                className="w-full pl-7 pr-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="general">General Campus</option>
              <option value="academic">Academic & Departmental</option>
              <option value="clubs">Clubs & Societies</option>
              <option value="memes">Memes & Fun</option>
              <option value="events">Events & Fest</option>
              <option value="sports">Sports & Fitness</option>
              <option value="hostel">Hostel & Campus Life</option>
              <option value="placement">Placements & Careers</option>
              <option value="market">Marketplace & Buy/Sell</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your campus group is about..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GroupsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 8;
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['communities', debouncedSearch],
    queryFn: () => api.getCommunities({ search: debouncedSearch, limit: '50' }),
  });

  const allCommunities = data?.items || [];
  const totalPages = Math.max(1, Math.ceil(allCommunities.length / ITEMS_PER_PAGE));
  
  const communities = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return allCommunities.slice(start, start + ITEMS_PER_PAGE);
  }, [allCommunities, page]);

  const isMember = (communityId: string) => {
    return (user as any)?.joinedCommunities?.includes(communityId) ?? false;
  };

  const handleCreateGroupClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to create a group');
      navigate('/login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      {/* MAIN COLUMN */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Explore Groups</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Find campus communities, branch channels, and interest hubs</p>
          </div>
          <button
            onClick={handleCreateGroupClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus size={14} /> Create Group
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Group Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2 animate-pulse skeleton h-28" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center text-muted-foreground text-sm space-y-3">
            <Users size={36} className="mx-auto text-muted-foreground/40" />
            <p>No groups found matching &quot;{search}&quot;</p>
            <button
              onClick={handleCreateGroupClick}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            >
              Create this group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communities.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-md overflow-hidden hover:border-primary/40 transition-colors flex flex-col">
                {/* Mini banner */}
                <div
                  className="h-10"
                  style={{
                    background: c.bannerUrl
                      ? `url(${c.bannerUrl}) center/cover no-repeat`
                      : 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.04))',
                  }}
                />

                <div className="p-3 flex flex-col gap-2 flex-1 -mt-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/g/${c.slug}`} className="flex items-center gap-2 group">
                      {/* Group avatar */}
                      <div className="w-9 h-9 rounded-lg border-2 border-card overflow-hidden bg-primary shrink-0 shadow-sm">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {c.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">g/{c.slug}</div>
                      </div>
                    </Link>
                    {c.isMember && (
                      <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded shrink-0 mt-1">Joined</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {c.description || 'Campus group for discussions, updates, and events.'}
                  </p>

                  <div className="mt-auto pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {(c.memberCount ?? 0).toLocaleString()} members
                    </span>
                    <Link to={`/g/${c.slug}`} className="text-primary font-semibold hover:underline">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-2 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({allCommunities.length} groups)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="hidden lg:block w-80 shrink-0 sticky top-16 self-start space-y-3">
        <div className="bg-card border border-border rounded-md p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Groups Hub</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Join groups matching your department, hobbies, or sports to customize your home feed. Can&apos;t find your club? Create your own group!
          </p>
          <button
            onClick={handleCreateGroupClick}
            className="w-full mt-2 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            + Create a New Group
          </button>
        </div>
      </aside>

      {isCreateModalOpen && <CreateGroupModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
}
