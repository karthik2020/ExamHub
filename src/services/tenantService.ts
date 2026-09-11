import { apiFetch } from './apiClient';
import { CMSPage, NavigationItem, Plan, Tenant } from '../types';

export const tenantService = {
  async getTenants(): Promise<Tenant[]> {
    return apiFetch<Tenant[]>('/api/tenants');
  },

  async getTenantBySlug(slug: string): Promise<Tenant> {
    return apiFetch<Tenant>(`/api/tenants/${slug}`);
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    return apiFetch<Tenant>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getPages(tenantId?: string): Promise<CMSPage[]> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<CMSPage[]>(`/api/cms/pages${q}`);
  },

  async getPage(slug: string): Promise<CMSPage> {
    return apiFetch<CMSPage>(`/api/cms/pages/${slug}`);
  },

  async updatePage(slug: string, data: Partial<CMSPage>): Promise<CMSPage> {
    return apiFetch<CMSPage>(`/api/cms/pages/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getNavigation(tenantId?: string, location?: string): Promise<NavigationItem[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (location) params.append('location', location);
    return apiFetch<NavigationItem[]>(`/api/cms/navigation?${params.toString()}`);
  },

  async getPlans(): Promise<Plan[]> {
    return apiFetch<Plan[]>('/api/plans');
  },
};
