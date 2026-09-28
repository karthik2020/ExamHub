import { supabase } from '../lib/supabase';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.API_BASE_URL || 'http://localhost:3000');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const customHeaders = (options?.headers as Record<string, string>) || {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (typeof process !== 'undefined' && process.env.TEST_DEMO_HEADER && !headers['x-demo-role']) {
    headers['x-demo-role'] = process.env.TEST_DEMO_HEADER;
  }

  // If Supabase Auth session exists and no Authorization header was manually specified, attach Bearer token
  if (!headers['Authorization'] && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // ignore session lookup failures
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}
