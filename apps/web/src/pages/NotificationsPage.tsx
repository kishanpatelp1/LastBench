import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { motion } from 'framer-motion';
import { Bell, MessageSquare, ArrowUp, UserPlus, CheckCheck, Loader2 } from 'lucide-react';
import { timeAgo } from '../lib/utils';
import { toast } from 'sonner';
import { Notification } from '../types';

const typeIcons: Record<string, typeof Bell> = {
  COMMENT: MessageSquare,
  REPLY: MessageSquare,
  VOTE: ArrowUp,
  MENTION: Bell,
  SYSTEM: Bell,
  COMMUNITY: UserPlus,
};

const getNotificationLink = (notif: Notification): string | null => {
  const data = notif.data ?? {};
  if (['COMMENT', 'REPLY', 'MENTION'].includes(notif.type)) {
    if (data.postId) {
      return data.commentId ? `/post/${data.postId}#comment-${data.commentId}` : `/post/${data.postId}`;
    }
  }
  if (notif.type === 'VOTE') {
    if (data.postId) return `/post/${data.postId}`;
  }
  if (notif.type === 'COMMUNITY') {
    if (data.communitySlug) return `/g/${data.communitySlug}`;
  }
  return null;
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      api.getNotifications({ limit: '20', ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const notifications = (data?.pages.flatMap((p) => p.items) ?? []) as unknown as Notification[];

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications read');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Notification) =>
              item.id === notif.id ? { ...item, isRead: true } : item
            ),
          })),
        };
      });

      try {
        await api.markNotificationRead(notif.id);
      } catch {
        // Ignore network failure on optimistic mark-read
      } finally {
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      }
    }

    const targetUrl = getNotificationLink(notif);
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-4 flex gap-6">
      {/* MAIN COLUMN */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Stay updated on your activity and replies</p>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium border border-border cursor-pointer transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-md bg-card border border-border p-3 flex items-start gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
            <Bell size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">When someone upvotes or replies to your posts, you will see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] ?? Bell;
              const link = getNotificationLink(notif);
              const isClickable = Boolean(link || !notif.isRead);

              return (
                <div
                  key={notif.id}
                  onClick={() => isClickable && handleNotificationClick(notif)}
                  className={`rounded-md border p-3 flex items-start gap-3 transition-colors ${
                    notif.isRead
                      ? 'bg-card border-border hover:border-primary/30'
                      : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notif.isRead ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{notif.title}</p>
                    {notif.body && <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                </div>
              );
            })}

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-4 py-2 rounded-md bg-card border border-border text-foreground text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="hidden lg:block w-80 shrink-0 sticky top-16 self-start space-y-3">
        <div className="bg-card border border-border rounded-md p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Activity Inbox</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get instant alerts when other students engage with your posts or group updates.
          </p>
        </div>
      </aside>
    </div>
  );
}
