import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, MessageSquare, ArrowRight } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { Community } from '../types';

export function CommunitiesPage() {
  const { data: communities, isLoading } = useQuery<Community[]>({
    queryKey: ['communities'],
    queryFn: () => api.getCommunities() as unknown as Promise<Community[]>,
  });

  const categoryColors: Record<string, string> = {
    general: 'from-blue-500 to-cyan-500',
    academic: 'from-emerald-500 to-teal-500',
    hostel: 'from-amber-500 to-orange-500',
    placement: 'from-violet-500 to-purple-500',
    memes: 'from-pink-500 to-rose-500',
    events: 'from-indigo-500 to-blue-500',
    sports: 'from-green-500 to-emerald-500',
    clubs: 'from-fuchsia-500 to-pink-500',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Communities</h1>
        <p className="text-muted-foreground mt-1">Join communities across campuses</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5 space-y-3">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(communities ?? []).map((community, i) => {
            const cat = community.category ?? 'general';
            const gradient = categoryColors[cat] ?? categoryColors.general;
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/c/${community.slug}`}
                  className="block group rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 overflow-hidden"
                >
                  {/* Banner gradient */}
                  <div className={`h-16 bg-gradient-to-r ${gradient} opacity-80`} />

                  <div className="p-5 -mt-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-card`}>
                        {community.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {community.name}
                        </h3>
                        {community.college && (
                          <p className="text-xs text-muted-foreground">{community.college}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all mt-1" />
                    </div>

                    {community.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {community.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={12} />{formatNumber(community.memberCount)} members</span>
                      <span className="flex items-center gap-1"><MessageSquare size={12} />{formatNumber(community.postCount)} posts</span>
                      {community.category && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold uppercase tracking-wider">
                          {community.category}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
