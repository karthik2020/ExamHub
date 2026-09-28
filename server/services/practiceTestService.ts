import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { PracticeTest, Question } from '../../src/types';
import { QuestionService } from './questionService';

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
    const callerClient = getDbClient(authHeader);
    const adminClient = getSupabaseAdminClient();
    let client = callerClient;

    // 1. Check if explicit test questions exist in practice_test_questions
    let { data: mappings, error: mapError } = await client
      .from('practice_test_questions')
      .select('question_id, display_order')
      .eq('practice_test_id', practiceTestId)
      .order('display_order', { ascending: true });

    // Fallback to adminClient if question bank is protected by RLS
    if ((!mappings || mappings.length === 0) && adminClient) {
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

    if (mappings && mappings.length > 0) {
      const questionIds = mappings.map((m: any) => m.question_id);
      let { data: questionsData, error: qError } = await client
        .from('questions')
        .select('*, question_options(*)')
        .in('id', questionIds);

      if ((!questionsData || questionsData.length === 0) && adminClient) {
        const adminQRes = await adminClient
          .from('questions')
          .select('*, question_options(*)')
          .in('id', questionIds);
        questionsData = adminQRes.data;
      }

      // Preserve mapped display_order
      const qMap = new Map((questionsData || []).map((q: any) => [q.id, q]));
      return mappings
        .map((m: any) => qMap.get(m.question_id))
        .filter(Boolean)
        .map((q: any) => QuestionService.formatQuestion(q));
    }

    return [];
  }

  async createPracticeTest(
    data: {
      tenant_id: string;
      exam_id: string;
      section_id?: string | null;
      name: string;
      description?: string;
      test_type?: 'PRACTICE' | 'MOCK' | 'DIAGNOSTIC' | 'CUSTOM';
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'ALL';
      question_selection_mode?: 'FIXED' | 'RANDOM' | 'GENERATED' | 'ADAPTIVE';
      question_count?: number;
      time_limit_minutes?: number;
      is_published?: boolean;
    },
    questionIds?: string[],
    authHeader?: string
  ): Promise<PracticeTest> {
    const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);

    const insertPayload: any = {
      tenant_id: data.tenant_id,
      exam_id: data.exam_id,
      section_id: data.section_id || null,
      name: data.name,
      description: data.description || '',
      test_type: data.test_type || 'PRACTICE',
      difficulty: data.difficulty || 'MEDIUM',
      question_selection_mode: data.question_selection_mode || 'FIXED',
      question_count: data.question_count || 10,
      time_limit_minutes: data.time_limit_minutes || 15,
      is_published: data.is_published !== undefined ? data.is_published : true,
    };

    const { data: created, error } = await adminClient
      .from('practice_tests')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create practice test in PostgreSQL: ${error?.message}`);
    }

    // Attach question associations if provided
    if (questionIds && questionIds.length > 0) {
      const mappingRows = questionIds.map((qId, idx) => ({
        practice_test_id: created.id,
        question_id: qId,
        display_order: idx + 1,
        marks: 1.0,
      }));
      await adminClient.from('practice_test_questions').insert(mappingRows);
    }

    return created as PracticeTest;
  }

  async updatePracticeTest(
    id: string,
    data: Partial<PracticeTest>,
    authHeader?: string
  ): Promise<PracticeTest> {
    const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);

    const { data: updated, error } = await adminClient
      .from('practice_tests')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update practice test in PostgreSQL: ${error?.message}`);
    }

    return updated as PracticeTest;
  }

  async deletePracticeTest(id: string, authHeader?: string): Promise<{ success: boolean }> {
    const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);

    const { error } = await adminClient.from('practice_tests').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete practice test from PostgreSQL: ${error.message}`);
    }

    return { success: true };
  }
}

export const practiceTestService = new PracticeTestService();
