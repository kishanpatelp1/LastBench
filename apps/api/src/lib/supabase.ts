import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let supabaseClient: SupabaseClient | null = null;

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (url && key) {
  supabaseClient = createClient(url, key);
  logger.info({ url }, '⚡ Supabase Storage client initialized for cloud file uploads');
} else {
  logger.info('ℹ️ Supabase credentials not set — uploads will fallback to local disk');
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}
