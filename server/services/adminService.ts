import { getDbClient } from '../supabase';
import { AuditLog } from '../../src/types';

export interface AdminOverviewStats {
  totalStudents: number;
  totalQuestions: number;
  totalTests: number;
  totalAttempts: number;
  avgScore: number;
  recentAttempts: any[];
}

export class AdminService {
  async getOverview(tenantId?: string, authHeader?: string): Promise<AdminOverviewStats> {
    const client = getDbClient(authHeader);

    // 1. Total Students
    let userQuery = client.from('users').select('*', { count: 'exact', head: true });
    const { count: studentCount } = await userQuery;

    // 2. Total Questions
    let qQuery = client.from('questions').select('*', { count: 'exact', head: true });
    if (tenantId) qQuery = qQuery.eq('tenant_id', tenantId);
    const { count: questionCount } = await qQuery;

    // 3. Total Tests
    let tQuery = client.from('practice_tests').select('*', { count: 'exact', head: true });
    if (tenantId) tQuery = tQuery.eq('tenant_id', tenantId);
    const { count: testCount } = await tQuery;

    // 4. Total Attempts
    let attQuery = client.from('attempts').select('*', { count: 'exact', head: true });
    if (tenantId) attQuery = attQuery.eq('tenant_id', tenantId);
    const { count: attemptCount } = await attQuery;

    // 5. Avg Score and Recent Attempts
    let recentQuery = client
      .from('attempts')
      .select('*, practice_tests(name), users(name, email)')
      .order('started_at', { ascending: false })
      .limit(10);

    if (tenantId) recentQuery = recentQuery.eq('tenant_id', tenantId);

    const { data: recentData } = await recentQuery;

    // Calculate real avg score of submitted tests
    const submittedAttempts = (recentData || []).filter((a: any) => a.status === 'SUBMITTED');
    const avgScore =
      submittedAttempts.length > 0
        ? Math.round(
            (submittedAttempts.reduce((acc: number, cur: any) => acc + Number(cur.percentage || 0), 0) /
              submittedAttempts.length) *
              10
          ) / 10
        : 0;

    return {
      totalStudents: studentCount ?? 0,
      totalQuestions: questionCount ?? 0,
      totalTests: testCount ?? 0,
      totalAttempts: attemptCount ?? 0,
      avgScore,
      recentAttempts: recentData || [],
    };
  }

  async getAuditLogs(tenantId?: string, limit = 50, authHeader?: string): Promise<AuditLog[]> {
    const client = getDbClient(authHeader);
    let query = client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve audit logs from PostgreSQL: ${error.message}`);
    }
    return (data || []) as AuditLog[];
  }

  async logAudit(entry: Partial<AuditLog>, authHeader?: string): Promise<void> {
    const client = getDbClient(authHeader);
    await client.from('audit_logs').insert([
      {
        ...entry,
        created_at: new Date().toISOString(),
      },
    ]);
  }
}

export const adminService = new AdminService();
