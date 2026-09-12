import { getDbClient } from '../supabase';
import { Plan, Tenant } from '../../src/types';

export class TenantService {
  async getAllTenants(authHeader?: string): Promise<Tenant[]> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to retrieve tenants from PostgreSQL: ${error.message}`);
    }
    return (data || []) as Tenant[];
  }

  async getTenantBySlug(slug: string, authHeader?: string): Promise<Tenant | null> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve tenant '${slug}' from PostgreSQL: ${error.message}`);
    }
    return data as Tenant | null;
  }

  async getTenantById(id: string, authHeader?: string): Promise<Tenant | null> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve tenant ID '${id}' from PostgreSQL: ${error.message}`);
    }
    return data as Tenant | null;
  }

  async updateTenant(id: string, updates: Partial<Tenant>, authHeader?: string): Promise<Tenant> {
    const client = getDbClient(authHeader);
    const updatePayload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // Ensure primary ID is not overwritten
    delete updatePayload.id;

    const { data, error } = await client
      .from('tenants')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tenant in PostgreSQL: ${error.message}`);
    }
    return data as Tenant;
  }

  async getPlans(tenantId?: string, authHeader?: string): Promise<Plan[]> {
    const client = getDbClient(authHeader);
    let query = client.from('plans').select('*').eq('status', 'ACTIVE');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve plans from PostgreSQL: ${error.message}`);
    }
    return (data || []) as Plan[];
  }
}

export const tenantService = new TenantService();
