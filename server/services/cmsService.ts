import { getDbClient } from '../supabase';
import { CMSPage, NavigationItem } from '../../src/types';

export class CmsService {
  async getPages(tenantId?: string, authHeader?: string): Promise<CMSPage[]> {
    const client = getDbClient(authHeader);
    let query = client
      .from('pages')
      .select('*')
      .order('display_order', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve pages from PostgreSQL: ${error.message}`);
    }
    return (data || []) as CMSPage[];
  }

  async getPageBySlug(slug: string, tenantId?: string, authHeader?: string): Promise<CMSPage | null> {
    const client = getDbClient(authHeader);
    let query = client.from('pages').select('*').eq('slug', slug);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to retrieve page '${slug}' from PostgreSQL: ${error.message}`);
    }
    return data as CMSPage | null;
  }

  async updatePage(slug: string, updates: Partial<CMSPage>, authHeader?: string): Promise<CMSPage> {
    const client = getDbClient(authHeader);
    const updatePayload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    delete updatePayload.id;

    const { data, error } = await client
      .from('pages')
      .update(updatePayload)
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update page in PostgreSQL: ${error.message}`);
    }
    return data as CMSPage;
  }

  async getNavigation(tenantId?: string, location?: string, authHeader?: string): Promise<NavigationItem[]> {
    const client = getDbClient(authHeader);
    let query = client
      .from('navigation_items')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve navigation from PostgreSQL: ${error.message}`);
    }
    return (data || []) as NavigationItem[];
  }
}

export const cmsService = new CmsService();
