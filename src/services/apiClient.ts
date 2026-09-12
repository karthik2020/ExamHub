import { supabase } from '../lib/supabase';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const customHeaders = (options?.headers as Record<string, string>) || {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

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

  // If no Supabase session token is present, check if client is in Demo Super Admin mode
  if (!headers['Authorization']) {
    const authMode = localStorage.getItem('examhub_auth_mode');
    const demoRole = localStorage.getItem('examhub_user_role');
    if (demoRole === 'SUPER_ADMIN' || (authMode === 'DEMO_MODE' && demoRole === 'SUPER_ADMIN')) {
      headers['x-demo-role'] = 'SUPER_ADMIN';
      headers['Authorization'] = 'Bearer demo-super-admin';
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
