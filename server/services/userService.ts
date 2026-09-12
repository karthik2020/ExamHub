import { getDbClient } from '../supabase';
import { Role, User, UserTier } from '../../src/types';

export class UserService {
  async getUsers(tenantId?: string, authHeader?: string): Promise<User[]> {
    const client = getDbClient(authHeader);

    let tuQuery = client.from('tenant_users').select('*, users(*)');
    if (tenantId) {
      tuQuery = tuQuery.eq('tenant_id', tenantId);
    }

    const { data: tuRows, error } = await tuQuery;
    if (error) {
      // If tenant_users fails or has RLS, try users table directly
      const { data: uRows, error: uError } = await client.from('users').select('*');
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

    return (tuRows || [])
      .filter((tu: any) => tu.users)
      .map((tu: any) => ({
        id: tu.users.id,
        email: tu.users.email,
        name: tu.users.name,
        avatar_url: tu.users.avatar_url,
        status: tu.users.status,
        role: tu.role as Role,
        tier: tu.tier as UserTier,
      }));
  }

  async getUserById(id: string, authHeader?: string): Promise<User | null> {
    const client = getDbClient(authHeader);
    const { data: userRow, error: uError } = await client
      .from('users')
      .select('*, tenant_users(*)')
      .eq('id', id)
      .maybeSingle();

    if (uError) {
      throw new Error(`Failed to retrieve user '${id}' from PostgreSQL: ${uError.message}`);
    }
    if (!userRow) return null;

    const tu = (userRow.tenant_users || [])[0];
    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      avatar_url: userRow.avatar_url,
      status: userRow.status,
      role: (tu?.role as Role) || 'STUDENT',
      tier: (tu?.tier as UserTier) || 'GUEST',
    };
  }

  async updateUserRole(id: string, role: Role, tier?: UserTier, authHeader?: string): Promise<User> {
    const client = getDbClient(authHeader);
    const updateData: Record<string, any> = {
      role,
      updated_at: new Date().toISOString(),
    };
    if (tier) updateData.tier = tier;

    const { error: tuError } = await client
      .from('tenant_users')
      .update(updateData)
      .eq('user_id', id);

    if (tuError) {
      throw new Error(`Failed to update user role in PostgreSQL: ${tuError.message}`);
    }

    const updated = await this.getUserById(id, authHeader);
    if (!updated) {
      throw new Error(`User updated but could not be reloaded`);
    }
    return updated;
  }
}

export const userService = new UserService();
