import type { ApiResponse, PaginatedResponse } from '@lastbench/shared';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

    const data = await res.json() as ApiResponse<T>;

    if (!res.ok) {
      throw new Error(data.error ?? `Request failed with status ${res.status}`);
    }

    return data.data as T;
  }

  // Auth
  async register(body: Record<string, unknown>) {
    return this.request<{ user: Record<string, unknown> }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: Record<string, unknown>) {
    return this.request<{ user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request<Record<string, unknown>>('/auth/me');
  }

  async verifyEmail(token: string) {
    return this.request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async resendVerification() {
    return this.request('/auth/resend-verification', { method: 'POST' });
  }

  async updateProfile(body: Record<string, unknown>) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Posts
  async getFeed(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/posts?${search}`);
  }

  async getPost(id: string) {
    return this.request<Record<string, unknown>>(`/posts/${id}`);
  }

  async createPost(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('/posts', {
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
    return this.request(`/posts/${postId}/poll/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  }

  async deletePost(id: string) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  }

  // Comments
  async getComments(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/comments?${search}`);
  }

  async createComment(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('/comments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async voteComment(id: string, type: 'UP' | 'DOWN') {
    return this.request(`/comments/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  // Communities
  async getCommunities() {
    return this.request<Record<string, unknown>[]>('/communities');
  }

  async getCommunity(slug: string) {
    return this.request<Record<string, unknown>>(`/communities/${slug}`);
  }

  async joinCommunity(id: string) {
    return this.request(`/communities/${id}/join`, { method: 'POST' });
  }

  async leaveCommunity(id: string) {
    return this.request(`/communities/${id}/leave`, { method: 'POST' });
  }

  // Notifications
  async getNotifications(params: Record<string, string> = {}) {
    const search = new URLSearchParams(params).toString();
    return this.request<PaginatedResponse<Record<string, unknown>>>(`/notifications?${search}`);
  }

  async getUnreadCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllRead() {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  // Search
  async search(params: Record<string, string>) {
    const search = new URLSearchParams(params).toString();
    return this.request<Record<string, unknown>>(`/search?${search}`);
  }

  // Reports
  async createReport(body: Record<string, unknown>) {
    return this.request('/admin/reports', {
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
}

export const api = new ApiClient();
