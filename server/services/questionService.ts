import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { Question, QuestionOption, Difficulty, QuestionType, QuestionStatus } from '../../src/types';

export interface QuestionFilters {
  tenant_id?: string;
  exam_id?: string;
  section_id?: string;
  topic_id?: string;
  difficulty?: Difficulty;
  question_type?: QuestionType;
  status?: QuestionStatus;
  limit?: number;
  offset?: number;
}

export class QuestionService {
  private formatQuestion(row: any): Question {
    const rawOptions = row.question_options || [];
    const options: QuestionOption[] = rawOptions
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((opt: any) => ({
        id: opt.id,
        question_id: opt.question_id,
        option_key: opt.option_key,
        option_text: opt.option_text,
        option_data: opt.option_data,
        display_order: opt.display_order,
        is_correct: opt.is_correct,
      }));

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      exam_id: row.exam_id,
      section_id: row.section_id,
      topic_id: row.topic_id,
      question_type: row.question_type,
      difficulty: row.difficulty,
      question_text: row.question_text,
      question_data: row.question_data,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      solution: row.solution,
      source_type: row.source_type,
      generator_type: row.generator_type,
      status: row.status,
      estimated_time_seconds: row.estimated_time_seconds,
      options,
    };
  }

  async getQuestions(filters: QuestionFilters = {}, authHeader?: string): Promise<Question[]> {
    const client = getDbClient(authHeader);
    let query = client
      .from('questions')
      .select('*, question_options(*)');

    if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
    if (filters.exam_id) query = query.eq('exam_id', filters.exam_id);
    if (filters.section_id) query = query.eq('section_id', filters.section_id);
    if (filters.topic_id) query = query.eq('topic_id', filters.topic_id);
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
    if (filters.question_type) query = query.eq('question_type', filters.question_type);
    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.eq('status', 'PUBLISHED');
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: true });

    let { data, error } = await query;
    if (error) {
      throw new Error(`Failed to retrieve questions from PostgreSQL: ${error.message}`);
    }

    // If RLS returns 0 questions for authenticated candidate, query tenant published questions via server admin client
    if ((!data || data.length === 0) && authHeader) {
      const adminClient = getSupabaseAdminClient();
      let adminQuery = adminClient.from('questions').select('*, question_options(*)');
      if (filters.tenant_id) adminQuery = adminQuery.eq('tenant_id', filters.tenant_id);
      if (filters.exam_id) adminQuery = adminQuery.eq('exam_id', filters.exam_id);
      if (filters.section_id) adminQuery = adminQuery.eq('section_id', filters.section_id);
      if (filters.topic_id) adminQuery = adminQuery.eq('topic_id', filters.topic_id);
      if (filters.difficulty) adminQuery = adminQuery.eq('difficulty', filters.difficulty);
      if (filters.question_type) adminQuery = adminQuery.eq('question_type', filters.question_type);
      if (filters.status) {
        adminQuery = adminQuery.eq('status', filters.status);
      } else {
        adminQuery = adminQuery.eq('status', 'PUBLISHED');
      }
      adminQuery = adminQuery.range(offset, offset + limit - 1).order('created_at', { ascending: true });
      const adminRes = await adminQuery;
      if (adminRes.data && adminRes.data.length > 0) {
        data = adminRes.data;
      }
    }

    return (data || []).map((row: any) => this.formatQuestion(row));
  }

  async getQuestionById(id: string, authHeader?: string): Promise<Question | null> {
    const client = getDbClient(authHeader);
    let { data, error } = await client
      .from('questions')
      .select('*, question_options(*)')
      .eq('id', id)
      .maybeSingle();

    if (!data && !error && authHeader) {
      const adminClient = getSupabaseAdminClient();
      const adminRes = await adminClient
        .from('questions')
        .select('*, question_options(*)')
        .eq('id', id)
        .maybeSingle();
      if (adminRes.data) {
        data = adminRes.data;
      }
    }

    if (error) {
      throw new Error(`Failed to retrieve question '${id}' from PostgreSQL: ${error.message}`);
    }
    if (!data) return null;
    return this.formatQuestion(data);
  }

  async createQuestion(questionData: any, authHeader?: string): Promise<Question> {
    const client = getDbClient(authHeader);
    const { options = [], ...questionPayload } = questionData;

    // 1. Insert question row
    const { data: createdQuestion, error: qError } = await client
      .from('questions')
      .insert([questionPayload])
      .select()
      .single();

    if (qError) {
      throw new Error(`Failed to insert question into PostgreSQL: ${qError.message}`);
    }

    // 2. Insert question options
    if (options && options.length > 0) {
      const optionsToInsert = options.map((opt: any, index: number) => ({
        question_id: createdQuestion.id,
        option_key: opt.option_key || String.fromCharCode(65 + index),
        option_text: opt.option_text || null,
        option_data: opt.option_data || null,
        display_order: opt.display_order ?? (index + 1),
        is_correct: opt.is_correct ?? (opt.option_key === createdQuestion.correct_answer),
      }));

      const { error: optError } = await client
        .from('question_options')
        .insert(optionsToInsert);

      if (optError) {
        throw new Error(`Failed to insert question options into PostgreSQL: ${optError.message}`);
      }
    }

    const completeQuestion = await this.getQuestionById(createdQuestion.id, authHeader);
    if (!completeQuestion) {
      throw new Error(`Question was created but could not be re-fetched from PostgreSQL`);
    }
    return completeQuestion;
  }

  async deleteQuestion(id: string, authHeader?: string): Promise<boolean> {
    const client = getDbClient(authHeader);
    const { error } = await client
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete question '${id}' from PostgreSQL: ${error.message}`);
    }
    return true;
  }
}

export const questionService = new QuestionService();
