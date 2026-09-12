import { getDbClient } from '../supabase';
import { Exam, ExamSection, Topic } from '../../src/types';

export class ExamService {
  async getExams(tenantId?: string, authHeader?: string): Promise<Exam[]> {
    const client = getDbClient(authHeader);
    let query = client.from('exams').select('*').eq('status', 'ACTIVE');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve exams from PostgreSQL: ${error.message}`);
    }
    return (data || []) as Exam[];
  }

  async getExamById(id: string, authHeader?: string): Promise<Exam | null> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve exam '${id}' from PostgreSQL: ${error.message}`);
    }
    return data as Exam | null;
  }

  async createExam(examData: Partial<Exam>, authHeader?: string): Promise<Exam> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('exams')
      .insert([examData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exam in PostgreSQL: ${error.message}`);
    }
    return data as Exam;
  }

  async getSectionsByExamId(examId: string, authHeader?: string): Promise<ExamSection[]> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('exam_sections')
      .select('*')
      .eq('exam_id', examId)
      .eq('status', 'ACTIVE')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to retrieve exam sections for exam '${examId}' from PostgreSQL: ${error.message}`);
    }
    return (data || []) as ExamSection[];
  }

  async getTopics(sectionId?: string, authHeader?: string): Promise<Topic[]> {
    const client = getDbClient(authHeader);
    let query = client
      .from('topics')
      .select('*')
      .order('display_order', { ascending: true });

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve topics from PostgreSQL: ${error.message}`);
    }
    return (data || []) as Topic[];
  }
}

export const examService = new ExamService();
