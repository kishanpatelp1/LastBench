import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Calendar, ExternalLink } from 'lucide-react';

import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { PostCard } from '../components/feed/PostCard';
import { CommentThread } from '../components/comments/CommentThread';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/feed');
    }
  };

  const { data: post, isLoading: isPostLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.getPost(id!),
    enabled: !!id,
  });

  const { data: community } = useQuery({
    queryKey: ['community', post?.community?.slug],
    queryFn: () => api.getCommunity(post!.community.slug),
    enabled: !!post?.community?.slug,
  });

  if (isPostLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-md p-8 text-center flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2">Post not found</h2>
          <p className="text-muted-foreground mb-4">This post may have been deleted or does not exist.</p>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const isMember = community?.isMember || false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 flex gap-6">
      <div className="flex-1 min-w-0 space-y-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Feed
        </button>

        <PostCard post={post} />
        
        <div className="bg-card border border-border rounded-md overflow-hidden p-4">
          <CommentThread postId={post.id} />
        </div>
      </div>

      <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-4 self-start space-y-3">
        {community ? (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="h-4 bg-secondary border-b border-border" />
            <div className="p-3">
              <Link to={`/g/${community.slug}`} className="flex items-center justify-between group">
                <h3 className="font-bold text-base group-hover:underline">{community.name}</h3>
                <ExternalLink size={14} className="text-muted-foreground group-hover:text-foreground" />
              </Link>
              
              {community.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-1 mb-3">
                  {community.description}
                </p>
              )}
              
              <div className="w-full h-px bg-border my-3" />
              
              <div className="flex gap-4">
                {community.slug === 'general' ? (
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">Campus-wide</div>
                      <div className="text-xs text-muted-foreground">Open to every student</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">{community.memberCount}</div>
                      <div className="text-xs text-muted-foreground">Members</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold">
                      {new Date(community.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border my-3" />

              <Link
                to={`/g/${community.slug}`}
                className="block w-full text-center py-1.5 px-4 rounded-full text-sm font-semibold border border-primary text-primary hover:bg-primary/5 transition-colors"
              >
                Go to Community
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-muted rounded w-full mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        )}
      </aside>
    </div>
  );
}
