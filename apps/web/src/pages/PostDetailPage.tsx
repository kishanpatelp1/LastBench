import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { PostCard } from '../components/feed/PostCard';
import { CommentThread } from '../components/comments/CommentThread';
import { Post } from '../types';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', id],
    queryFn: () => api.getPost(id!) as unknown as Promise<Post>,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <p className="text-5xl mb-2">🫥</p>
        <h2 className="text-xl font-bold text-foreground">Post not found</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          This post may have been deleted by the student author, archived, or you followed an outdated link.
        </p>
        <div className="pt-2">
          <Link
            to="/feed"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <PostCard post={post} />
      <CommentThread postId={id!} />
    </div>
  );
}
