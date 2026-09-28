import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { Plan, Tenant } from '../../src/types';

export class TenantService {
  async getAllTenants(authHeader?: string): Promise<Tenant[]> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

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
    const callerClient = getDbClient(authHeader);
    const updatePayload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // Ensure primary ID is not overwritten
    delete updatePayload.id;

    let { data, error } = await callerClient
      .from('tenants')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!data || error) {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        const adminRes = await adminClient
          .from('tenants')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .maybeSingle();
        data = adminRes.data;
        error = adminRes.error;
      }
    }

    if (error) {
      throw new Error(`Failed to update tenant in PostgreSQL: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Tenant '${id}' not found in PostgreSQL`);
    }
    return data as Tenant;
  }

  async getPlans(tenantId?: string, authHeader?: string): Promise<Plan[]> {
    const client = getDbClient(authHeader);
    let query = client.from('plans').select('*').eq('status', 'ACTIVE');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    let { data, error } = await query;
    if ((!data || data.length === 0) && !error) {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        let adminQuery = adminClient.from('plans').select('*').eq('status', 'ACTIVE');
        if (tenantId) {
          adminQuery = adminQuery.eq('tenant_id', tenantId);
        }
        const adminRes = await adminQuery;
        if (adminRes.data && adminRes.data.length > 0) {
          data = adminRes.data;
        }
      }
    }
    if (error && (!data || data.length === 0)) {
      throw new Error(`Failed to retrieve plans from PostgreSQL: ${error.message}`);
    }
    return (data || []) as Plan[];
  }
}

export const tenantService = new TenantService();
