import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Community, Post } from '../types';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(query.trim());
  };

  const { data, isLoading } = useQuery<{ posts: Post[]; communities: Community[] }>({
    queryKey: ['search', searched],
    queryFn: () => api.search({ q: searched, type: 'all', limit: '20' }) as unknown as Promise<{ posts: Post[]; communities: Community[] }>,
    enabled: searched.length > 0,
  });

  const posts = data?.posts ?? [];
  const communities = data?.communities ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, groups..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg transition-all"
        />
      </form>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {searched && !isLoading && (
        <div className="space-y-6">
          {communities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Groups</h2>
              <div className="space-y-2">
                {communities.map((c) => (
                  <Link key={c.id} to={`/g/${c.slug}`} className="block p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{c.description}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {posts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Posts</h2>
              <div className="space-y-2">
                {posts.map((p) => (
                  <Link key={p.id} to={`/post/${p.id}`} className="block p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                    {p.title && <p className="font-semibold text-foreground mb-1">{p.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {posts.length === 0 && communities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results for &quot;{searched}&quot;</p>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-20">
          <Search size={48} className="text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Search for posts and groups</p>
        </div>
      )}
    </div>
  );
}
