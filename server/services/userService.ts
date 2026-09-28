import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { Role, User, UserTier } from '../../src/types';

export class UserService {
  async getUsers(tenantId?: string, authHeader?: string): Promise<User[]> {
    const client = getDbClient(authHeader);
    const adminClient = getSupabaseAdminClient() || client;

    let tuQuery = adminClient.from('tenant_users').select('*, users(*)');
    if (tenantId) {
      tuQuery = tuQuery.eq('tenant_id', tenantId);
    }

    const { data: tuRows, error } = await tuQuery;
    if (error) {
      // If tenant_users fails, fallback to users table directly
      const { data: uRows, error: uError } = await adminClient.from('users').select('*');
      if (uError) {
        throw new Error(`Failed to retrieve users from PostgreSQL: ${uError.message}`);
      }
      return (uRows || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar_url: u.avatar_url,
        status: u.status,
        role: 'STUDENT' as Role,
        tier: 'GUEST' as UserTier,
      }));
    }

    // Fetch active subscriptions to determine true tier
    let subQuery = adminClient.from('subscriptions').select('user_id, status, expires_at').eq('status', 'ACTIVE');
    if (tenantId) {
      subQuery = subQuery.eq('tenant_id', tenantId);
    }
    const { data: activeSubs } = await subQuery;
    const paidUserIds = new Set(
      (activeSubs || [])
        .filter((s: any) => !s.expires_at || new Date(s.expires_at).getTime() > Date.now())
        .map((s: any) => s.user_id)
    );

    return (tuRows || [])
      .filter((tu: any) => tu.users)
      .map((tu: any) => {
        const u = tu.users;
        const isPaid = paidUserIds.has(u.id);
        const tier: UserTier = isPaid ? 'PAID' : tu.role === 'SUPER_ADMIN' ? 'PAID' : 'REGISTERED';

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          avatar_url: u.avatar_url,
          status: u.status,
          role: tu.role as Role,
          tier,
        };
      });
  }

  async getUserById(id: string, authHeader?: string): Promise<User | null> {
    const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);
    const { data: userRow, error: uError } = await adminClient
      .from('users')
      .select('*, tenant_users(*)')
      .eq('id', id)
      .maybeSingle();

    if (uError) {
      throw new Error(`Failed to retrieve user '${id}' from PostgreSQL: ${uError.message}`);
    }
    if (!userRow) return null;

    const tu = (userRow.tenant_users || [])[0];

    // Check active subscriptions
    const { data: activeSub } = await adminClient
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('user_id', id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    const isPaid = Boolean(activeSub && (!activeSub.expires_at || new Date(activeSub.expires_at).getTime() > Date.now()));
    const tier: UserTier = isPaid ? 'PAID' : (tu?.role === 'SUPER_ADMIN' ? 'PAID' : 'REGISTERED');

    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      avatar_url: userRow.avatar_url,
      status: userRow.status,
      role: (tu?.role as Role) || 'STUDENT',
      tier,
    };
  }

  async updateUserRole(id: string, role: Role, tier?: UserTier, authHeader?: string): Promise<User> {
    const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);

    // 1. Update role in tenant_users
    const { data: tuRow } = await adminClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', id)
      .maybeSingle();

    const tenantId = tuRow?.tenant_id || 'a0000000-0000-0000-0000-000000000001';

    const { error: tuError } = await adminClient
      .from('tenant_users')
      .update({ role, status: 'ACTIVE' })
      .eq('user_id', id);

    if (tuError) {
      throw new Error(`Failed to update user role in PostgreSQL: ${tuError.message}`);
    }

    // 2. Authoritative Subscription tier handling
    if (tier === 'PAID') {
      // Find pro plan
      const { data: proPlan } = await adminClient
        .from('plans')
        .select('id')
        .eq('tenant_id', tenantId)
        .gt('price', 0)
        .limit(1)
        .maybeSingle();

      const planId = proPlan?.id || 'e1000000-0000-0000-0000-000000000003';

      // Ensure active subscription in subscriptions table
      const { data: existingSub } = await adminClient
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', id)
        .maybeSingle();

      if (existingSub) {
        await adminClient
          .from('subscriptions')
          .update({ status: 'ACTIVE', plan_id: planId, expires_at: null })
          .eq('id', existingSub.id);
      } else {
        await adminClient.from('subscriptions').insert({
          tenant_id: tenantId,
          user_id: id,
          plan_id: planId,
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
        });
      }
    } else if (tier === 'REGISTERED' || tier === 'GUEST') {
      // Cancel any active subscriptions
      await adminClient
        .from('subscriptions')
        .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
        .eq('user_id', id)
        .eq('status', 'ACTIVE');
    }

    const updated = await this.getUserById(id, authHeader);
    if (!updated) {
      throw new Error(`User updated but could not be reloaded`);
    }
    return updated;
  }
}

export const userService = new UserService();
