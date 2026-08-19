/**
 * Pure response-shaping logic for a post, pulled out of posts.service.ts
 * so it can be unit-tested without a live Prisma/Postgres connection.
 * Takes the raw Prisma `include`-shaped object and produces the public
 * API shape (anonymizing the author, computing poll percentages, etc).
 */

// Type representing a raw Prisma post with its included relations.
// Uses an index signature to stay compatible with various
// Prisma include shapes (feed, getById, create, search).
interface RawPost {
  id: string;
  title: string | null;
  content: string;
  type: string;
  linkUrl?: string | null;
  isAnonymous: boolean;
  mediaUrls: string[];
  tags: string[];
  score: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  community: { id: string; name: string; slug: string; avatarUrl: string | null };
  votes?: Array<{ type: string }>;
  poll?: {
    id: string;
    expiresAt: Date | string | null;
    options: Array<{
      id: string;
      text: string;
      _count?: { votes: number };
      votes?: Array<{ id?: string }>;
    }>;
  } | null;
  [key: string]: unknown; // allow extra Prisma fields
}

export function formatPost(post: RawPost, _userId?: string) {
  const votes = post.votes;
  const userVote = Array.isArray(votes) && votes.length > 0
    ? votes[0]?.type ?? null
    : null;

  const author = post.author;
  const formattedAuthor = post.isAnonymous
    ? { id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null }
    : author;

  const poll = post.poll;
  let formattedPoll = null;
  if (poll) {
    const options = poll.options;
    const totalVotes = options.reduce((sum, o) => {
      const count = o._count?.votes ?? 0;
      return sum + count;
    }, 0);

    // BUGFIX: this used to write `formattedPoll!.userVotedOptionId = ...`
    // from *inside* the .map() that builds formattedPoll's own `options`
    // array — i.e. while the `formattedPoll = { ... }` assignment on the
    // outer variable was still being evaluated. `formattedPoll` was still
    // its previous value (null) at that point, so this threw
    // "Cannot set properties of null" — a 500 — on every request for a
    // poll post where the viewer had actually voted. Computing it as a
    // separate local first, then including it in the object literal,
    // avoids the self-reference entirely.
    let userVotedOptionId: string | null = null;
    const formattedOptions = options.map((o) => {
      const voteCount = o._count?.votes ?? 0;
      const hasUserVoted = Array.isArray(o.votes) && o.votes.length > 0;
      if (hasUserVoted) userVotedOptionId = o.id;
      return {
        id: o.id,
        text: o.text,
        voteCount,
        percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
      };
    });

    formattedPoll = {
      id: poll.id,
      expiresAt: poll.expiresAt,
      totalVotes,
      userVotedOptionId,
      options: formattedOptions,
    };
  }

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    type: post.type,
    linkUrl: post.linkUrl ?? null,
    isAnonymous: post.isAnonymous,
    mediaUrls: post.mediaUrls,
    tags: post.tags,
    score: post.score,
    commentCount: post.commentCount,
    isPinned: post.isPinned,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: formattedAuthor,
    community: post.community,
    userVote,
    poll: formattedPoll,
  };
}
