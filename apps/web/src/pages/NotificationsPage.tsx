import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { motion } from 'framer-motion';
import { Bell, MessageSquare, ArrowUp, UserPlus, CheckCheck } from 'lucide-react';
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

export function NotificationsPage() {
  const { data, isLoading } = useQuery<{ items: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications() as unknown as Promise<{ items: Notification[] }>,
  });

  const notifications = data?.items ?? [];

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your activity</p>
        </div>
        {notifications.length > 0 && (
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
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${
                  notif.isRead
                    ? 'bg-card border-border'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
        </div>
      )}
    </div>
  );
}
