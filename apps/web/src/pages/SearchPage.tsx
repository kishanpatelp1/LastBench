import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Search, Loader2, Users, FileText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Community, Post } from '../types';
import { PostCard } from '../components/feed/PostCard';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(urlQuery);
  const [searched, setSearched] = useState(urlQuery);

  // Sync state when URL search params change (e.g. from top bar search)
  useEffect(() => {
    setQuery(urlQuery);
    setSearched(urlQuery.trim());
  }, [urlQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setSearched(trimmed);
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const { data, isLoading } = useQuery<{ posts: Post[]; communities: Community[] }>({
    queryKey: ['search', searched],
    queryFn: () => api.search({ q: searched, type: 'all', limit: '20' }) as unknown as Promise<{ posts: Post[]; communities: Community[] }>,
    enabled: searched.length > 0,
  });

  const posts = data?.posts ?? [];
  const communities = data?.communities ?? [];

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      {/* MAIN COLUMN */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Search LastBench</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Find campus posts, groups, and discussions</p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, groups, topics..."
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-colors"
          />
        </form>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 size={18} className="animate-spin text-primary" /> Searching...
          </div>
        )}

        {searched && !isLoading && (
          <div className="space-y-6">
            {communities.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} /> Matching Groups ({communities.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {communities.map((c) => (
                    <Link key={c.id} to={`/g/${c.slug}`} className="block p-3 rounded-md bg-card border border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                          {c.name?.[0]?.toUpperCase() || 'G'}
                        </div>
                        <span className="font-semibold text-sm text-foreground truncate">{c.name || c.slug}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">g/{c.slug}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {posts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Matching Posts ({posts.length})
                </h2>
                <div className="space-y-2">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </div>
            )}

            {posts.length === 0 && communities.length === 0 && (
              <div className="bg-card border border-border rounded-md py-12 text-center text-sm text-muted-foreground">
                No results found for &quot;{searched}&quot;. Try searching for another topic or group name.
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
            <Search size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Type a query above to start searching</p>
            <p className="text-xs text-muted-foreground mt-1">Search for campus posts, confessions, buy/sell items, or group hubs</p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="hidden lg:block w-80 shrink-0 sticky top-16 self-start space-y-3">
        <div className="bg-card border border-border rounded-md p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Search Tips</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Search by keyword, group handle (e.g. <span className="font-mono text-foreground">confessions</span>), or post content.
          </p>
        </div>
      </aside>
    </div>
  );
}
