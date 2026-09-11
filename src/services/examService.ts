import { apiFetch } from './apiClient';
import { Exam, ExamSection, PracticeTest, Topic } from '../types';

export const examService = {
  async getExams(tenantId?: string): Promise<Exam[]> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return apiFetch<Exam[]>(`/api/exams${q}`);
  },

  async getExam(id: string): Promise<Exam> {
    return apiFetch<Exam>(`/api/exams/${id}`);
  },

  async getSections(examId: string): Promise<ExamSection[]> {
    return apiFetch<ExamSection[]>(`/api/exams/${examId}/sections`);
  },

  async getTopics(sectionId?: string): Promise<Topic[]> {
    const q = sectionId ? `?section_id=${sectionId}` : '';
    return apiFetch<Topic[]>(`/api/topics${q}`);
  },

  async getPracticeTests(tenantId?: string, examId?: string): Promise<PracticeTest[]> {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (examId) params.append('exam_id', examId);
    return apiFetch<PracticeTest[]>(`/api/practice-tests?${params.toString()}`);
  },

  async getPracticeTest(id: string): Promise<PracticeTest> {
    return apiFetch<PracticeTest>(`/api/practice-tests/${id}`);
  },
};
