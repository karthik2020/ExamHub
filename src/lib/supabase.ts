import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch {}
  return '';
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
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

const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
const supabaseAnonKey = sanitizeKey(rawKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);
