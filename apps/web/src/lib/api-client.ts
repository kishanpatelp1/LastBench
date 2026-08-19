import type { ApiResponse, PaginatedResponse } from '@lastbench/shared';
import type { Post, Community, CommunityMember, User, Comment, Notification } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Search results shape returned by the /search endpoint. */
export interface SearchResults {
  posts: Post[];
  communities: Community[];
  users: User[];
}

interface ReportTarget {
  id: string;
  content: string;
  isDeleted: boolean;
  author: {
    id: string;
    username: string;
    isBanned: boolean;
  };
}

/** Report shape returned by admin endpoints. */
export interface Report {
  id: string;
  reporterId: string;
  postId?: string | null;
  commentId?: string | null;
  userId?: string | null;
  reason: string;
  details?: string | null;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  aiScore?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  reporter?: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  post?: ReportTarget | null;
  comment?: ReportTarget | null;
  reportedUser?: { id: string; username: string } | null;
}

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include', // send the httpOnly session cookie on every request
    });

    let data: ApiResponse<T>;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = (await res.json()) as ApiResponse<T>;
    } else {
      const text = await res.text();
      throw new Error(`Server error (${res.status}): ${text.slice(0, 100) || res.statusText}`);
    }

    if (!res.ok) {
      throw new Error(data.error ?? `Request failed with status ${res.status}`);
    }

    return data.data as T;
  }

  // Auth
  async register(body: Record<string, unknown>) {
    return this.request<{ user: User; requireVerification?: boolean; message?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: Record<string, unknown>) {
    return this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  async verifyEmail(token: string) {
    return this.request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async resendVerification(email: string) {
    return this.request<{ message?: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updateProfile(body: Record<string, unknown>) {
    return this.request<User>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Posts
  async getFeed(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Post>>(`/posts?${search}`);
  }

  async getPost(id: string) {
    return this.request<Post>(`/posts/${id}`);
  }

  async createPost(body: Record<string, unknown>) {
    return this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async votePost(id: string, type: 'UP' | 'DOWN') {
    return this.request<{ postId: string; score: number }>(`/posts/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async votePoll(postId: string, optionId: string) {
    return this.request<{ success: boolean }>(`/posts/${postId}/poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  }

  async deletePost(id: string) {
    return this.request<{ success: boolean }>(`/posts/${id}`, { method: 'DELETE' });
  }

  async reportPost(postId: string, reason: string) {
    return this.request<Report>('/admin/reports', {
      method: 'POST',
      body: JSON.stringify({ postId, reason }),
    });
  }

  async getUserPosts(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Post>>(`/posts?${search}`);
  }

  // Comments
  async getComments(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Comment>>(`/comments?${search}`);
  }

  async createComment(body: Record<string, unknown>) {
    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async voteComment(id: string, type: 'UP' | 'DOWN') {
    return this.request<{ commentId: string; score: number }>(`/comments/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async deleteComment(id: string) {
    return this.request<{ success: boolean }>(`/comments/${id}`, { method: 'DELETE' });
  }

  // Communities
  async getCommunities(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Community>>(
      search ? `/communities?${search}` : '/communities',
    );
  }

  async getCommunity(slug: string) {
    return this.request<Community>(`/communities/${slug}`);
  }

  async getCommunityMembers(slug: string, params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<CommunityMember>>(
      search ? `/communities/${slug}/members?${search}` : `/communities/${slug}/members`
    );
  }

  async deleteCommunity(slug: string) {
    return this.request<{ success: boolean }>(`/communities/${slug}`, { method: 'DELETE' });
  }

  async createCommunity(body: Record<string, unknown>) {
    return this.request<Community>('/communities', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateCommunity(slug: string, body: Record<string, unknown>) {
    return this.request<Community>(`/communities/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async joinCommunity(id: string) {
    return this.request<{ success: boolean }>(`/communities/${id}/join`, { method: 'POST' });
  }

  async leaveCommunity(id: string) {
    return this.request<{ success: boolean }>(`/communities/${id}/leave`, { method: 'POST' });
  }

  async updateMemberRole(slug: string, userId: string, role: 'MOD' | 'MEMBER') {
    return this.request<{ success: boolean }>(`/communities/${slug}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeCommunityMember(slug: string, userId: string) {
    return this.request<{ success: boolean }>(`/communities/${slug}/members/${userId}`, { method: 'DELETE' });
  }

  async transferOwnership(slug: string, newOwnerId: string) {
    return this.request<{ success: boolean }>(`/communities/${slug}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    });
  }

  async getUserProfile(username: string) {
    return this.request<User>(`/auth/user/${username}`);
  }

  // Notifications
  async getNotifications(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Notification>>(`/notifications?${search}`);
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
  }

  // Search
  async search(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    return this.request<SearchResults>(`/search?${search}`);
  }

  // Reports
  async createReport(body: Record<string, unknown>) {
    return this.request<Report>('/admin/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Upload
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ url: string; filename: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Admin
  async getAdminStats() {
    return this.request<{ users: number; posts: number; reports: number; communities: number }>('/admin/stats');
  }

  async getAdminReports(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Report>>(`/admin/reports?${search}`);
  }

  async updateReportStatus(id: string, status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED') {
    return this.request<Report>(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async banUser(id: string, ban: boolean = true) {
    return this.request<{ success: boolean }>(`/admin/users/${id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ ban }),
    });
  }
}

export const api = new ApiClient();
