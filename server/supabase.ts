import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sanitize Supabase URL from environment variable (handles raw code snippets or standard URLs)
export function getSanitizedSupabaseUrl(): string {
  const raw = process.env.SUPABASE_URL || '';
  const match = raw.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return match ? match[0] : raw.trim();
}

// Robust sanitization of API keys (extracts JWT if user pasted JS assignment or quotes)
export function sanitizeApiKey(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const jwtMatch = trimmed.match(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/);
  if (jwtMatch) {
    return jwtMatch[0];
  }
  const quoteMatch = trimmed.match(/["']([^"']+)["']/);
  if (quoteMatch) {
    return quoteMatch[1];
  }
  return trimmed;
}

function pickValidJwt(candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    if (!c) continue;
    const sanitized = sanitizeApiKey(c);
    if (sanitized.startsWith('eyJ') && sanitized.split('.').length === 3) {
      return sanitized;
    }
  }
  for (const c of candidates) {
    if (!c) continue;
    const sanitized = sanitizeApiKey(c);
    if (sanitized && !sanitized.includes('KEY')) {
      return sanitized;
    }
  }
  return sanitizeApiKey(candidates[0] || '');
}

export function getSupabaseAnonKey(): string {
  return pickValidJwt([process.env.SUPABASE_ANON_KEY, process.env.SUPABASE_KEY]);
}

export function getSupabaseServiceKey(): string {
  return pickValidJwt([process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SERVICE_KEY]);
}

// Check role from JWT token
export function inspectJwtRole(token: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.role || null;
  } catch {
    return null;
  }
}

// Server-side Supabase client with public anon key
export function getSupabaseClient(): SupabaseClient | null {
  const url = getSanitizedSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

// Server-side Supabase admin client (requires valid service_role key)
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSanitizedSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) return null;
  // If the key is a valid JWT or string, initialize client
  return createClient(url, key);
}

// User-scoped Supabase client that forwards authenticated student's JWT token
export function getSupabaseUserClient(token: string): SupabaseClient | null {
  const url = getSanitizedSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key || !token) return null;
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
      },
    },
  });
}

// Determine best client for a given request:
// 1. User client if JWT Authorization header is provided
// 2. Admin client if privileged operations / service role key is available
// 3. Anon client as standard default
export function getDbClient(authHeader?: string): SupabaseClient {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token && token.startsWith('ey')) {
    const userClient = getSupabaseUserClient(token);
    if (userClient) return userClient;
  }

  // Check if admin client with valid service role is available
  const serviceKey = getSupabaseServiceKey();
  const serviceRole = inspectJwtRole(serviceKey);
  if (serviceRole === 'service_role') {
    const adminClient = getSupabaseAdminClient();
    if (adminClient) return adminClient;
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Please check SUPABASE_URL and SUPABASE_KEY.');
  }
  return client;
}

export interface DatabaseStatus {
  hasUrl: boolean;
  rawUrl: string;
  configuredUrl: string;
  targetProjectMatches: boolean;
  hasAnonKey: boolean;
  anonKeyRole: string | null;
  hasServiceKey: boolean;
  serviceKeyRole: string | null;
  tablesFound: string[];
  tablesMissing: string[];
  dmatHubTenantExists: boolean;
  dmatExamExists: boolean;
  questionsCount: number;
  sectionsCount: number;
  topicsCount: number;
  queryError?: string | null;
}

export async function verifySupabaseConnection(): Promise<DatabaseStatus> {
  const rawUrl = process.env.SUPABASE_URL || '';
  const configuredUrl = getSanitizedSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceKey();
  const targetProject = 'https://bxeyafzvqncqggfehlge.supabase.co';

  const status: DatabaseStatus = {
    hasUrl: Boolean(configuredUrl),
    rawUrl: rawUrl ? (rawUrl.length > 80 ? rawUrl.slice(0, 80) + '...' : rawUrl) : '',
    configuredUrl,
    targetProjectMatches: configuredUrl.toLowerCase() === targetProject.toLowerCase(),
    hasAnonKey: Boolean(anonKey),
    anonKeyRole: inspectJwtRole(anonKey),
    hasServiceKey: Boolean(serviceKey),
    serviceKeyRole: inspectJwtRole(serviceKey),
    tablesFound: [],
    tablesMissing: [],
    dmatHubTenantExists: false,
    dmatExamExists: false,
    questionsCount: 0,
    sectionsCount: 0,
    topicsCount: 0,
    queryError: null,
  };

  const client = getDbClient();
  if (!client) {
    status.queryError = 'Supabase client could not be initialized: missing URL or Key.';
    return status;
  }

  const checkTables = [
    'tenants',
    'users',
    'tenant_users',
    'exams',
    'exam_sections',
    'topics',
    'questions',
    'question_options',
    'practice_tests',
    'attempts',
    'attempt_answers',
    'pages',
    'navigation_items',
    'plans',
  ];

  for (const tableName of checkTables) {
    try {
      const { data, error } = await client.from(tableName).select('*').limit(1);
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
          status.tablesMissing.push(tableName);
        } else {
          status.tablesMissing.push(`${tableName} (error: ${error.message})`);
        }
      } else {
        status.tablesFound.push(tableName);
      }
    } catch (e: any) {
      status.tablesMissing.push(`${tableName} (${e.message})`);
    }
  }

  // Check dMATHub tenant if tenants table exists
  if (status.tablesFound.includes('tenants')) {
    try {
      const { data } = await client.from('tenants').select('*').eq('slug', 'dmathub').limit(1);
      if (data && data.length > 0) {
        status.dmatHubTenantExists = true;
      }
    } catch {}
  }

  // Check dMAT exam if exams table exists
  if (status.tablesFound.includes('exams')) {
    try {
      const { data } = await client.from('exams').select('*').eq('slug', 'dmat').limit(1);
      if (data && data.length > 0) {
        status.dmatExamExists = true;
      }
    } catch {}
  }

  // Check sections count
  if (status.tablesFound.includes('exam_sections')) {
    try {
      const { count } = await client.from('exam_sections').select('*', { count: 'exact', head: true });
      status.sectionsCount = count || 0;
    } catch {}
  }

  // Check topics count
  if (status.tablesFound.includes('topics')) {
    try {
      const { count } = await client.from('topics').select('*', { count: 'exact', head: true });
      status.topicsCount = count || 0;
    } catch {}
  }

  // Check questions count
  if (status.tablesFound.includes('questions')) {
    try {
      const { count } = await client.from('questions').select('*', { count: 'exact', head: true });
      status.questionsCount = count || 0;
    } catch {}
  }

  return status;
}
