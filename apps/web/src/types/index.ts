export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  branch?: string | null;
  year?: number | null;
  email?: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  createdAt: string;
  bio?: string | null;
  _count?: {
    posts: number;
    comments: number;
  };
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  category?: string | null;
  isMember?: boolean;
  userRole?: 'OWNER' | 'MOD' | 'MEMBER' | null;
  memberCount: number;
  postCount: number;
  createdAt: string;
  rules?: CommunityRule[];
}

export interface CommunityRule {
  id: string;
  title: string;
  description?: string | null;
  orderNum: number;
}

export interface CommunityMember {
  id: string;
  role: 'OWNER' | 'MOD' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    branch?: string | null;
    year?: number | null;
  };
}


export interface PollOption {
  id: string;
  text: string;
  percentage: number;
  voteCount: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string | null;
}

export interface Post {
  id: string;
  title?: string | null;
  content: string;
  type: string;
  linkUrl?: string | null;
  isAnonymous: boolean;
  isPinned?: boolean;
  mediaUrls?: string[];
  score: number;
  commentCount: number;
  userVote?: 'UP' | 'DOWN' | null;
  createdAt: string;
  tags?: string[];
  author: User;
  community: Community;
  poll?: Poll | null;
}

export interface Comment {
  id: string;
  content: string;
  score: number;
  isAnonymous: boolean;
  createdAt: string;
  author: User;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: { postId?: string; commentId?: string; communitySlug?: string; [key: string]: unknown } | null;
  isRead: boolean;
  createdAt: string;
}
