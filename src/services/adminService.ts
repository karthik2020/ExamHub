import { apiFetch } from './apiClient';
import { AuditLog, Difficulty, GenerationValidationResult, Question, User } from '../types';

export interface AdminOverviewStats {
  totalStudents: number;
  totalQuestions: number;
  totalTests: number;
  totalAttempts: number;
  avgScore: string;
  recentAttempts: any[];
}

export const adminService = {
  async getOverview(tenantId?: string): Promise<AdminOverviewStats> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<AdminOverviewStats>(`/api/admin/overview${q}`);
  },

  async getQuestions(filters?: { section_id?: string; difficulty?: string }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters?.section_id) params.append('section_id', filters.section_id);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    return apiFetch<Question[]>(`/api/admin/questions?${params.toString()}`);
  },

  async createQuestion(q: Partial<Question>): Promise<Question> {
    return apiFetch<Question>('/api/admin/questions', {
      method: 'POST',
      body: JSON.stringify(q),
    });
  },

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/admin/questions/${id}`, {
      method: 'DELETE',
    });
  },

  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('/api/admin/users');
  },

  async updateUserRole(id: string, role: string, tier: string): Promise<User> {
    return apiFetch<User>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, tier }),
    });
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return apiFetch<AuditLog[]>('/api/admin/audit-logs');
  },

  async testFigureGenerator(
    seed: string,
    difficulty: Difficulty
  ): Promise<{ question: Question; validation: GenerationValidationResult }> {
    return apiFetch<{ question: Question; validation: GenerationValidationResult }>(
      `/api/generator/figure-sequence?seed=${encodeURIComponent(seed)}&difficulty=${difficulty}`
    );
  },
};
