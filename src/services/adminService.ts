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

export interface AdminQuestionFilters {
  tenant_id?: string;
  exam_id?: string;
  section_id?: string;
  topic_id?: string;
  difficulty?: string;
  question_type?: string;
  status?: string;
}

export const adminService = {
  async getOverview(tenantId?: string): Promise<AdminOverviewStats> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<AdminOverviewStats>(`/api/admin/overview${q}`);
  },

  async getQuestions(filters?: AdminQuestionFilters): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters?.exam_id) params.append('exam_id', filters.exam_id);
    if (filters?.section_id) params.append('section_id', filters.section_id);
    if (filters?.topic_id) params.append('topic_id', filters.topic_id);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.question_type) params.append('question_type', filters.question_type);
    if (filters?.status) params.append('status', filters.status);
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

  async getUsers(tenantId?: string): Promise<User[]> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<User[]>(`/api/admin/users${q}`);
  },

  async updateUserRole(id: string, role: string, tier: string): Promise<User> {
    return apiFetch<User>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, tier }),
    });
  },

  async getAuditLogs(tenantId?: string): Promise<AuditLog[]> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<AuditLog[]>(`/api/admin/audit-logs${q}`);
  },

  async createPracticeTest(testData: any): Promise<any> {
    return apiFetch<any>('/api/admin/practice-tests', {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  },

  async updatePracticeTest(id: string, testData: any): Promise<any> {
    return apiFetch<any>(`/api/admin/practice-tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testData),
    });
  },

  async deletePracticeTest(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/admin/practice-tests/${id}`, {
      method: 'DELETE',
    });
  },

  async createSection(sectionData: any): Promise<any> {
    return apiFetch<any>('/api/admin/sections', {
      method: 'POST',
      body: JSON.stringify(sectionData),
    });
  },

  async createTopic(topicData: any): Promise<any> {
    return apiFetch<any>('/api/admin/topics', {
      method: 'POST',
      body: JSON.stringify(topicData),
    });
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
