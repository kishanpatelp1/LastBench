// ─── API Response Types ─────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// ─── User Types ─────────────────────────────────────
export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  college: string | null;
  branch: string | null;
  year: number | null;
  bio: string | null;
  createdAt: string;
}

export interface AuthUser extends PublicUser {
  email: string;
  role: 'STUDENT' | 'MODERATOR' | 'ADMIN';
  emailVerified: boolean;
}

// ─── Post Types ─────────────────────────────────────
export interface PostItem {
  id: string;
  title: string | null;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'POLL' | 'LINK' | 'VIDEO';
  linkUrl?: string | null;
  isAnonymous: boolean;
  mediaUrls: string[];
  tags: string[];
  score: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  community: PostCommunity;
  userVote: 'UP' | 'DOWN' | null;
  poll?: PollData;
}

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PostCommunity {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

export interface PollData {
  id: string;
  options: PollOptionData[];
  expiresAt: string | null;
  totalVotes: number;
  userVotedOptionId: string | null;
}

export interface PollOptionData {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

// ─── Comment Types ──────────────────────────────────
export interface CommentItem {
  id: string;
  content: string;
  isAnonymous: boolean;
  score: number;
  depth: number;
  createdAt: string;
  author: PostAuthor;
  userVote: 'UP' | 'DOWN' | null;
  replyCount: number;
  replies?: CommentItem[];
}

// ─── Community Types ────────────────────────────────
export interface CommunityItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  college: string | null;
  category: string | null;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  createdAt: string;
}

// ─── Notification Types ─────────────────────────────
export interface NotificationItem {
  id: string;
  type: 'COMMENT' | 'REPLY' | 'VOTE' | 'MENTION' | 'SYSTEM' | 'COMMUNITY';
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Socket Events ──────────────────────────────────
export interface ServerToClientEvents {
  'post:new': (post: PostItem) => void;
  'post:vote': (data: { postId: string; score: number }) => void;
  'comment:new': (comment: CommentItem & { postId: string }) => void;
  'comment:vote': (data: { commentId: string; score: number }) => void;
  'notification:new': (notification: NotificationItem) => void;
  'user:typing': (data: { postId: string; username: string }) => void;
  'community:activity': (data: { communityId: string; type: string; count: number }) => void;
}

export interface ClientToServerEvents {
  'post:subscribe': (postId: string) => void;
  'post:unsubscribe': (postId: string) => void;
  'community:join': (communitySlug: string) => void;
  'community:leave': (communitySlug: string) => void;
  'user:typing': (postId: string) => void;
}
