export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  college?: string | null;
  branch?: string | null;
  year?: number | null;
  email?: string;
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
  college?: string | null;
  category?: string | null;
  memberCount: number;
  postCount: number;
  createdAt: string;
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
  isAnonymous: boolean;
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
  isRead: boolean;
  createdAt: string;
}
