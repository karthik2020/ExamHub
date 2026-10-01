import { supabase } from '../lib/supabase';

export const CLOUD_RUN_API_BASE_URL = 'https://examhub-backend-1080639596705.asia-southeast1.run.app';

export function getApiBaseUrl(): string {
  // If explicitly overridden via Vite environment variable
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }

  // Browser context
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Local development or localhost preview: use relative API URL
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return '';
    }
    // AI Studio local development/preview test runners on same origin port 3000
    if (hostname.includes('.run.app') && hostname.startsWith('ais-')) {
      return '';
    }
    // Production frontend (e.g. https://examhub-engine.ai.studio):
    // Route browser API requests to Cloud Run production backend
    return CLOUD_RUN_API_BASE_URL;
  }

  // Node.js / Server-side context (e.g. scripts/test-payment-security.ts, Cloud Run internal)
  return process.env.API_BASE_URL || 'http://localhost:3000';
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
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
