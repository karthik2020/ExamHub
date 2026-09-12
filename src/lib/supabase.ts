import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const match = rawUrl.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
const supabaseUrl = match ? match[0] : rawUrl.trim();
function sanitizeKey(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const jwtMatch = trimmed.match(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/);
  if (jwtMatch) return jwtMatch[0];
  const quoteMatch = trimmed.match(/["']([^"']+)["']/);
  if (quoteMatch) return quoteMatch[1];
  return trimmed;
}

const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAnonKey = sanitizeKey(rawKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);
