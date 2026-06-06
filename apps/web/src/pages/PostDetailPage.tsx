import { useParams } from 'react-router-dom';
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
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🫥</p>
        <p className="text-muted-foreground">Post not found</p>
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
