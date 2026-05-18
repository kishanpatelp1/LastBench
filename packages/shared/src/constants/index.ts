export const ROLES = {
  STUDENT: 'STUDENT',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

export const POST_TYPES = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  POLL: 'POLL',
  LINK: 'LINK',
} as const;

export const COMMUNITY_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'placement', label: 'Placements' },
  { value: 'memes', label: 'Memes' },
  { value: 'events', label: 'Events' },
  { value: 'sports', label: 'Sports' },
  { value: 'clubs', label: 'Clubs' },
] as const;

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'violence', label: 'Violence' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'nsfw', label: 'NSFW Content' },
  { value: 'doxxing', label: 'Doxxing' },
  { value: 'other', label: 'Other' },
] as const;

export const FEED_SORT_OPTIONS = [
  { value: 'hot', label: 'Hot', icon: '🔥' },
  { value: 'new', label: 'New', icon: '✨' },
  { value: 'top', label: 'Top', icon: '🏆' },
] as const;

export const TIME_RANGE_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
] as const;

export const MAX_POST_LENGTH = 10000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_POLL_OPTIONS = 6;
export const MAX_TAGS = 5;
export const MAX_MEDIA = 4;
export const DEFAULT_PAGE_SIZE = 20;
