import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { Shield, Users, FileText, Flag, Layers, CheckCircle, XCircle, Trash2, Ban, ExternalLink, Loader2 } from 'lucide-react';
import { formatNumber, timeAgo } from '../lib/utils';
import { toast } from 'sonner';

const statusBadges: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Pending Review' },
  REVIEWED: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Under Review' },
  RESOLVED: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Resolved (Actioned)' },
  DISMISSED: { color: 'bg-secondary text-muted-foreground border-border', label: 'Dismissed' },
};

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Authorize only Admin or Mod
  if (user && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <Shield size={54} className="text-red-500/40 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm">This dashboard is strictly reserved for campus administrators and moderators.</p>
      </div>
    );
  }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getAdminStats(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports', selectedStatus],
    queryFn: () => api.getAdminReports({ status: selectedStatus, limit: '50' }),
    enabled: user?.role === 'ADMIN' || user?.role === 'MODERATOR',
  });

  const reports = reportsData?.items ?? [];

  const handleUpdateStatus = async (reportId: string, newStatus: 'RESOLVED' | 'DISMISSED' | 'REVIEWED') => {
    setActionInProgress(reportId);
    try {
      await api.updateReportStatus(reportId, newStatus);
      toast.success(`Report marked as ${newStatus.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteContent = async (report: any) => {
    if (!confirm('Permanently delete this reported content?')) return;
    setActionInProgress(report.id);
    try {
      if (report.postId && report.post) {
        await api.deletePost(report.postId);
      } else if (report.commentId && report.comment) {
        await api.deleteComment(report.commentId);
      }
      toast.success('Content deleted successfully');
      await api.updateReportStatus(report.id, 'RESOLVED');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleBan = async (authorId: string, currentBanState?: boolean) => {
    const nextState = !currentBanState;
    if (!confirm(`${nextState ? 'Ban' : 'Unban'} this campus user account?`)) return;
    try {
      await api.banUser(authorId, nextState);
      toast.success(`User has been ${nextState ? 'banned' : 'unbanned'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to modify ban status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 md:pb-8">
      {/* Header & Stats */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              Campus Moderation Center
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold tracking-wider uppercase">
                {user?.role}
              </span>
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Monitor campus safety, triage student content reports, and enforce rules.</p>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Campus Students', value: stats?.users ?? 0, icon: Users, color: 'text-violet-400 bg-violet-500/10' },
              { label: 'Active Posts', value: stats?.posts ?? 0, icon: FileText, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Pending Reports', value: stats?.reports ?? 0, icon: Flag, color: 'text-amber-400 bg-amber-500/10' },
              { label: 'Campus Groups', value: stats?.communities ?? 0, icon: Layers, color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((stat, i) => (
              <div key={i} className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-foreground mt-1">
                    {statsLoading ? <span className="skeleton w-12 h-6 inline-block rounded" /> : formatNumber(stat.value)}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flag size={18} className="text-amber-400" />
            Content Reports
          </h2>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-secondary/60 rounded-xl border border-border w-fit">
            {(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedStatus === status
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {reportsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-44 rounded-2xl bg-card border border-border" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border p-8 space-y-3">
            <CheckCircle size={48} className="text-emerald-500/40 mx-auto" />
            <h3 className="text-lg font-bold text-foreground">No {selectedStatus.toLowerCase()} reports</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              All reported campus content in this queue has been triaged by moderators!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const badge = statusBadges[report.status] ?? { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Pending Review' };
              const target = report.post || report.comment;
              const targetAuthor = target?.author;
              const isPost = Boolean(report.postId);

              return (
                <div key={report.id} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 hover:border-border/80 transition-all">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg font-black text-xs uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                        {report.reason}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Reported {timeAgo(report.createdAt)} by <span className="text-foreground">u/{report.reporter?.username ?? 'Student'}</span>
                      </span>
                    </div>

                    {isPost ? (
                      <Link
                        to={`/post/${report.postId}`}
                        target="_blank"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                      >
                        <span>View Open Post</span>
                        <ExternalLink size={13} />
                      </Link>
                    ) : report.commentId ? (
                      <span className="text-xs font-semibold text-muted-foreground">Reported Comment</span>
                    ) : null}
                  </div>

                  {/* Reported Content Box */}
                  <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {isPost ? 'Post Content' : 'Comment Content'} {target?.isDeleted && '(Already Deleted)'}
                      </span>
                      {targetAuthor && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Author: u/{targetAuthor.username}</span>
                          {targetAuthor.isBanned && (
                            <span className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px] uppercase">
                              Banned
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                      {target ? target.content : <span className="text-muted-foreground italic">[Content removed or not accessible]</span>}
                    </p>
                    {report.details && (
                      <div className="pt-2 border-t border-border/40 mt-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">Reporter notes:</span> {report.details}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Triage Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {report.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                          disabled={actionInProgress === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          Mark Resolved
                        </button>
                      )}
                      {report.status !== 'DISMISSED' && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                          disabled={actionInProgress === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Dismiss Report
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {target && !target.isDeleted && (
                        <button
                          onClick={() => handleDeleteContent(report)}
                          disabled={actionInProgress === report.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-semibold text-xs border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionInProgress === report.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete Content
                        </button>
                      )}
                      {targetAuthor && (
                        <button
                          onClick={() => handleToggleBan(targetAuthor.id, targetAuthor.isBanned)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                            targetAuthor.isBanned
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                              : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                          }`}
                        >
                          <Ban size={14} />
                          {targetAuthor.isBanned ? 'Unban Author' : 'Ban Author'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
