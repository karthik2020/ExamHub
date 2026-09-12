import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { PracticeTest, Question } from '../../src/types';
import { questionService } from './questionService';

export interface PracticeTestFilters {
  tenant_id?: string;
  exam_id?: string;
  section_id?: string;
  is_published?: boolean;
}

export class PracticeTestService {
  async getPracticeTests(filters: PracticeTestFilters = {}, authHeader?: string): Promise<PracticeTest[]> {
    const client = getDbClient(authHeader);
    let query = client.from('practice_tests').select('*');

    if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
    if (filters.exam_id) query = query.eq('exam_id', filters.exam_id);
    if (filters.section_id) query = query.eq('section_id', filters.section_id);
    if (filters.is_published !== undefined) {
      query = query.eq('is_published', filters.is_published);
    } else {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) {
      throw new Error(`Failed to retrieve practice tests from PostgreSQL: ${error.message}`);
    }
    return (data || []) as PracticeTest[];
  }

  async getPracticeTestById(id: string, authHeader?: string): Promise<PracticeTest | null> {
    const client = getDbClient(authHeader);
    const { data, error } = await client
      .from('practice_tests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve practice test '${id}' from PostgreSQL: ${error.message}`);
    }
    return data as PracticeTest | null;
  }

  async getPracticeTestQuestions(practiceTestId: string, authHeader?: string): Promise<Question[]> {
    let client = getDbClient(authHeader);
    // 1. Check if explicit test questions exist in practice_test_questions
    let { data: mappings, error: mapError } = await client
      .from('practice_test_questions')
      .select('question_id, display_order')
      .eq('practice_test_id', practiceTestId)
      .order('display_order', { ascending: true });

    if ((!mappings || mappings.length === 0) && authHeader) {
      const adminClient = getSupabaseAdminClient();
      const adminRes = await adminClient
        .from('practice_test_questions')
        .select('question_id, display_order')
        .eq('practice_test_id', practiceTestId)
        .order('display_order', { ascending: true });
      if (adminRes.data && adminRes.data.length > 0) {
        mappings = adminRes.data;
        client = adminClient;
      }
    }

    if (mapError && !mappings) {
      throw new Error(`Failed to query practice test questions mapping: ${mapError.message}`);
    }

    if (mappings && mappings.length > 0) {
      const questionIds = mappings.map((m: any) => m.question_id);
      let { data: questionsData, error: qError } = await client
        .from('questions')
        .select('*, question_options(*)')
        .in('id', questionIds);

      if ((!questionsData || questionsData.length === 0) && authHeader) {
        const adminClient = getSupabaseAdminClient();
        const adminRes = await adminClient
          .from('questions')
          .select('*, question_options(*)')
          .in('id', questionIds);
        if (adminRes.data && adminRes.data.length > 0) {
          questionsData = adminRes.data;
        }
      }

      if (qError && !questionsData) {
        throw new Error(`Failed to load linked questions from PostgreSQL: ${qError.message}`);
      }

      // Preserve mapped display_order
      const qMap = new Map((questionsData || []).map((q: any) => [q.id, q]));
      return mappings
        .map((m: any) => qMap.get(m.question_id))
        .filter(Boolean)
        .map((q: any) => (questionService as any).formatQuestion(q));
    }

    return [];
  }
}

export const practiceTestService = new PracticeTestService();
