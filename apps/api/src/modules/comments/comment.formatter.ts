/**
 * Pure response-shaping logic for a comment, pulled out of
 * comments.service.ts so it can be unit-tested without a live
 * Prisma/Postgres connection. Anonymizes the author when the comment was
 * posted anonymously.
 */
export function formatComment(comment: Record<string, unknown>) {
  const isAnon = comment.isAnonymous as boolean;
  const author = comment.author as Record<string, unknown>;

  // Mirrors post.formatter.ts: the caller passes the vote row for the
  // *current* user (if any) via a filtered Prisma `include`, and we surface
  // just its direction here.
  const votes = comment.votes as Array<Record<string, unknown>> | undefined;
  const userVote = Array.isArray(votes) && votes.length > 0
    ? (votes[0] as Record<string, string>).type
    : null;

  return {
    id: comment.id,
    content: comment.content,
    isAnonymous: isAnon,
    score: comment.score,
    depth: comment.depth,
    createdAt: comment.createdAt,
    author: isAnon
      ? { id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null }
      : author,
    userVote,
  };
}
