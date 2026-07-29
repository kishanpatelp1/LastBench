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
      toast.error('Failed');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      // Optimistically update local query cache
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

      queryClient.setQueryData(['notifications-unread-count'], (old: any) => {
        if (!old || typeof old.count !== 'number') return old;
        return { count: Math.max(0, old.count - 1) };
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
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your activity</p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-all border border-border cursor-pointer"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-4 flex items-start gap-3">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/3" /></div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={48} className="text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = typeIcons[notif.type] ?? Bell;
            const link = getNotificationLink(notif);
            const isClickable = Boolean(link || !notif.isRead);

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => isClickable && handleNotificationClick(notif)}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${
                  notif.isRead
                    ? 'bg-card border-border hover:border-primary/20'
                    : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                } ${isClickable ? 'cursor-pointer' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.isRead ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  {notif.body && <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
                {!notif.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 flex-shrink-0" />}
              </motion.div>
            );
          })}

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 rounded-xl bg-secondary text-foreground font-medium flex items-center gap-2 hover:bg-muted transition-all border border-border cursor-pointer"
              >
                {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </motion.button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
