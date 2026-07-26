-- Create pg_trgm extension and GIN indexes for fuzzy search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS post_content_trgm_idx ON "Post" USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS post_title_trgm_idx ON "Post" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS community_name_trgm_idx ON "Community" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS community_description_trgm_idx ON "Community" USING gin (description gin_trgm_ops);
