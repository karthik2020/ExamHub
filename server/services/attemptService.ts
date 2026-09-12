import { getDbClient } from '../supabase';
import { Attempt, AttemptAnswer, Difficulty, Question, UserTier } from '../../src/types';
import { resolveUserEntitlement } from '../../src/types/entitlements';
import { practiceTestService } from './practiceTestService';
import { questionService } from './questionService';
import { scoringService } from './scoringService';
import { generateFigureSequence } from '../../src/generator/figureSequenceEngine';

export interface StartAttemptParams {
  practice_test_id: string;
  user_id?: string;
  tenant_id?: string;
  difficulty?: Difficulty;
  question_count?: number;
  user_tier?: UserTier;
}

export interface StartAttemptResponse {
  attempt_id: string;
  started_at: string;
  time_limit_seconds: number;
  test_type: string;
  test_name: string;
  total_questions: number;
  questions: Question[];
}

export class AttemptService {
  private sanitizeQuestionForCandidate(q: Question): Question {
    return {
      ...q,
      correct_answer: undefined,
      explanation: undefined,
      solution: undefined,
      options: q.options.map((opt) => ({
        ...opt,
        is_correct: undefined,
      })),
    };
  }

  async startAttempt(params: StartAttemptParams, authHeader?: string): Promise<StartAttemptResponse> {
    const client = getDbClient(authHeader);

    // 1. Fetch practice test
    const test = await practiceTestService.getPracticeTestById(params.practice_test_id, authHeader);
    if (!test) {
      throw new Error(`Practice test '${params.practice_test_id}' not found in PostgreSQL`);
    }

    // Entitlement resolution
    const userTier: UserTier = params.user_tier || (authHeader ? 'REGISTERED' : 'GUEST');
    const entitlement = resolveUserEntitlement(userTier, Boolean(authHeader));

    // Cap question count by tier entitlement
    const requestedCount = params.question_count || test.question_count || 10;
    const targetCount = Math.min(requestedCount, entitlement.maxQuestionsPerSession);
    const targetDifficulty = params.difficulty || (test.difficulty === 'ALL' ? 'MEDIUM' : test.difficulty);

    let selectedQuestions: Question[] = [];

    // 2. Select questions based on selection mode
    if (test.question_selection_mode === 'GENERATED') {
      // Procedural Figure Sequence Generation
      const generatedList: Question[] = [];
      for (let i = 0; i < targetCount; i++) {
        const seed = `fs-live-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
        const { question } = generateFigureSequence(
          seed,
          targetDifficulty as Difficulty,
          test.exam_id,
          test.section_id || '',
          test.tenant_id
        );
        // Persist generated question to PostgreSQL so it has valid relational integrity
        const persistedQ = await questionService.createQuestion(question, authHeader);
        generatedList.push(persistedQ);
      }
      selectedQuestions = generatedList;
    } else {
      // FIXED or RANDOM from PostgreSQL database
      const mappedQuestions = await practiceTestService.getPracticeTestQuestions(test.id, authHeader);

      if (mappedQuestions.length > 0) {
        selectedQuestions = mappedQuestions.slice(0, targetCount);
      } else {
        // Query pool from questions table
        const pool = await questionService.getQuestions(
          {
            tenant_id: test.tenant_id,
            exam_id: test.exam_id,
            section_id: test.section_id,
            difficulty: targetDifficulty as Difficulty,
            limit: 50,
          },
          authHeader
        );

        if (pool.length === 0) {
          // If no questions match specific section/difficulty, load any published questions for this exam
          const fallbackPool = await questionService.getQuestions(
            {
              tenant_id: test.tenant_id,
              exam_id: test.exam_id,
              limit: 50,
            },
            authHeader
          );
          if (fallbackPool.length === 0) {
            throw new Error(`No published questions found in PostgreSQL for exam '${test.exam_id}'`);
          }
          selectedQuestions = fallbackPool;
        } else {
          selectedQuestions = pool;
        }

        if (test.question_selection_mode === 'RANDOM') {
          // Shuffle
          selectedQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);
        }
        selectedQuestions = selectedQuestions.slice(0, targetCount);
      }
    }

    if (selectedQuestions.length === 0) {
      throw new Error(`Could not assemble questions for test '${test.name}' from PostgreSQL`);
    }

    // 3. Resolve student user ID
    // Default fallback to seeded guest user if unauthenticated
    let effectiveUserId = params.user_id || '10000000-0000-0000-0000-000000000003';
    if (authHeader) {
      const { data: userData } = await client.auth.getUser();
      if (userData?.user?.id) {
        effectiveUserId = userData.user.id;
      }
    }

    // 4. Create attempt record in PostgreSQL
    const attemptId = crypto.randomUUID();
    const now = new Date().toISOString();
    const timeLimitSeconds = (test.time_limit_minutes || 15) * 60;

    const { data: attemptRow, error: attemptError } = await client
      .from('attempts')
      .insert([
        {
          id: attemptId,
          tenant_id: test.tenant_id,
          user_id: effectiveUserId,
          practice_test_id: test.id,
          started_at: now,
          time_limit_seconds: timeLimitSeconds,
          time_spent_seconds: 0,
          status: 'IN_PROGRESS',
          score: 0,
          max_score: selectedQuestions.length,
          percentage: 0,
          correct_count: 0,
          incorrect_count: 0,
          skipped_count: selectedQuestions.length,
        },
      ])
      .select()
      .single();

    if (attemptError) {
      throw new Error(`Failed to create attempt record in PostgreSQL: ${attemptError.message}`);
    }

    // 5. Pre-seed attempt_answers records in PostgreSQL
    const answerInserts = selectedQuestions.map((q) => ({
      attempt_id: attemptId,
      question_id: q.id,
      selected_answer: null,
      is_correct: null,
      started_at: now,
      time_spent_seconds: 0,
      marks_awarded: 0,
    }));

    const { error: answersError } = await client
      .from('attempt_answers')
      .insert(answerInserts);

    if (answersError) {
      throw new Error(`Failed to initialize attempt answers in PostgreSQL: ${answersError.message}`);
    }

    // 6. Return sanitized candidate payload
    return {
      attempt_id: attemptId,
      started_at: attemptRow.started_at,
      time_limit_seconds: timeLimitSeconds,
      test_type: test.test_type,
      test_name: test.name,
      total_questions: selectedQuestions.length,
      questions: selectedQuestions.map((q) => this.sanitizeQuestionForCandidate(q)),
    };
  }

  async getAttemptById(attemptId: string, authHeader?: string): Promise<Attempt | null> {
    const client = getDbClient(authHeader);

    // 1. Fetch attempt row
    const { data: attemptRow, error: attError } = await client
      .from('attempts')
      .select('*, practice_tests(name)')
      .eq('id', attemptId)
      .maybeSingle();

    if (attError) {
      throw new Error(`Failed to load attempt from PostgreSQL: ${attError.message}`);
    }
    if (!attemptRow) return null;

    // 2. Fetch all recorded answers with full question options
    const { data: answerRows, error: ansError } = await client
      .from('attempt_answers')
      .select('*, questions(*, question_options(*))')
      .eq('attempt_id', attemptId);

    if (ansError) {
      throw new Error(`Failed to load attempt answers from PostgreSQL: ${ansError.message}`);
    }

    const answersMap: Record<string, AttemptAnswer> = {};
    const questionsList: Question[] = [];
    const isSubmitted = attemptRow.status === 'SUBMITTED' || attemptRow.status === 'AUTO_SUBMITTED';

    for (const row of answerRows || []) {
      const qRaw = row.questions;
      let questionObj: Question | undefined;

      if (qRaw) {
        questionObj = (questionService as any).formatQuestion(qRaw);
      } else if (row.question_id) {
        questionObj = (await questionService.getQuestionById(row.question_id, authHeader)) || undefined;
      }

      if (questionObj) {
        if (!isSubmitted) {
          // If in progress and not checked, sanitize
          if (row.is_correct === null) {
            questionObj = this.sanitizeQuestionForCandidate(questionObj);
          }
        }
        questionsList.push(questionObj);
      }

      answersMap[row.question_id] = {
        id: row.id,
        attempt_id: row.attempt_id,
        question_id: row.question_id,
        selected_answer: row.selected_answer || undefined,
        is_correct: row.is_correct ?? undefined,
        started_at: row.started_at,
        answered_at: row.answered_at,
        time_spent_seconds: row.time_spent_seconds ?? 0,
        marks_awarded: Number(row.marks_awarded ?? 0),
        correct_answer: isSubmitted || row.is_correct !== null ? questionObj?.correct_answer : undefined,
        explanation: isSubmitted || row.is_correct !== null ? questionObj?.explanation : undefined,
        solution: isSubmitted || row.is_correct !== null ? questionObj?.solution : undefined,
      };
    }

    return {
      id: attemptRow.id,
      tenant_id: attemptRow.tenant_id,
      user_id: attemptRow.user_id,
      practice_test_id: attemptRow.practice_test_id,
      practice_test_name: attemptRow.practice_tests?.name,
      started_at: attemptRow.started_at,
      submitted_at: attemptRow.submitted_at,
      time_limit_seconds: attemptRow.time_limit_seconds,
      time_spent_seconds: attemptRow.time_spent_seconds,
      status: attemptRow.status,
      score: Number(attemptRow.score ?? 0),
      max_score: Number(attemptRow.max_score ?? 0),
      percentage: Number(attemptRow.percentage ?? 0),
      correct_count: attemptRow.correct_count ?? 0,
      incorrect_count: attemptRow.incorrect_count ?? 0,
      skipped_count: attemptRow.skipped_count ?? 0,
      answers: answersMap,
      questions: questionsList,
    };
  }

  async saveAnswer(
    params: { attempt_id: string; question_id: string; selected_option_key: string; time_spent_seconds?: number },
    authHeader?: string
  ): Promise<{ success: boolean }> {
    const client = getDbClient(authHeader);
    const now = new Date().toISOString();

    const { error: ansError } = await client
      .from('attempt_answers')
      .update({
        selected_answer: params.selected_option_key,
        answered_at: now,
        time_spent_seconds: params.time_spent_seconds || 0,
      })
      .eq('attempt_id', params.attempt_id)
      .eq('question_id', params.question_id);

    if (ansError) {
      throw new Error(`Failed to save answer in PostgreSQL: ${ansError.message}`);
    }

    // Also update attempt elapsed time if provided
    if (params.time_spent_seconds) {
      await client
        .from('attempts')
        .update({ time_spent_seconds: params.time_spent_seconds })
        .eq('id', params.attempt_id);
    }

    return { success: true };
  }

  async checkAnswer(
    params: { attempt_id: string; question_id: string; selected_option_key: string; time_spent_seconds?: number },
    authHeader?: string
  ): Promise<{
    is_correct: boolean;
    correct_answer?: string;
    explanation?: string;
    solution?: string;
    attempt_stats: {
      score: number;
      correct_count: number;
      incorrect_count: number;
      skipped_count: number;
    };
  }> {
    const client = getDbClient(authHeader);

    // 1. Authoritatively fetch question from PostgreSQL
    const question = await questionService.getQuestionById(params.question_id, authHeader);
    if (!question) {
      throw new Error(`Question '${params.question_id}' not found in PostgreSQL`);
    }

    const isCorrect =
      Boolean(question.correct_answer) &&
      params.selected_option_key.trim().toUpperCase() === question.correct_answer?.trim().toUpperCase();

    const marksAwarded = isCorrect ? 1.0 : 0;
    const now = new Date().toISOString();

    // 2. Persist answer to PostgreSQL
    const { error: ansError } = await client
      .from('attempt_answers')
      .update({
        selected_answer: params.selected_option_key,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        answered_at: now,
        time_spent_seconds: params.time_spent_seconds || 0,
      })
      .eq('attempt_id', params.attempt_id)
      .eq('question_id', params.question_id);

    if (ansError) {
      throw new Error(`Failed to record checked answer in PostgreSQL: ${ansError.message}`);
    }

    // 3. Re-aggregate intermediate counts on attempts
    const { data: allAnswers } = await client
      .from('attempt_answers')
      .select('selected_answer, is_correct, marks_awarded')
      .eq('attempt_id', params.attempt_id);

    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;

    for (const a of allAnswers || []) {
      if (!a.selected_answer) {
        skippedCount++;
      } else if (a.is_correct) {
        correctCount++;
        score += Number(a.marks_awarded || 1);
      } else {
        incorrectCount++;
      }
    }

    await client
      .from('attempts')
      .update({
        score,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        skipped_count: skippedCount,
      })
      .eq('id', params.attempt_id);

    return {
      is_correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      solution: question.solution,
      attempt_stats: {
        score,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        skipped_count: skippedCount,
      },
    };
  }

  async submitAttempt(attemptId: string, authHeader?: string): Promise<Attempt> {
    const client = getDbClient(authHeader);

    // 1. Fetch attempt and all answers joined with questions
    const { data: attemptRow, error: attError } = await client
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (attError || !attemptRow) {
      throw new Error(`Attempt '${attemptId}' not found in PostgreSQL: ${attError?.message}`);
    }

    const { data: answerRows, error: ansError } = await client
      .from('attempt_answers')
      .select('*, questions(*, question_options(*))')
      .eq('attempt_id', attemptId);

    if (ansError) {
      throw new Error(`Failed to load answers for grading from PostgreSQL: ${ansError.message}`);
    }

    const questions: Question[] = [];
    const savedAnswersMap: Record<string, Partial<AttemptAnswer>> = {};

    for (const row of answerRows || []) {
      if (row.questions) {
        questions.push((questionService as any).formatQuestion(row.questions));
      }
      savedAnswersMap[row.question_id] = {
        attempt_id: attemptId,
        question_id: row.question_id,
        selected_answer: row.selected_answer,
        time_spent_seconds: row.time_spent_seconds,
      };
    }

    // 2. Perform authoritative server-side scoring
    const result = scoringService.evaluateAttempt(questions, savedAnswersMap);

    // 3. Update all attempt_answers rows in PostgreSQL
    for (const q of questions) {
      const evalAns = result.evaluatedAnswers[q.id];
      if (evalAns) {
        await client
          .from('attempt_answers')
          .update({
            is_correct: evalAns.is_correct,
            marks_awarded: evalAns.marks_awarded,
          })
          .eq('attempt_id', attemptId)
          .eq('question_id', q.id);
      }
    }

    // 4. Update attempts row in PostgreSQL
    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from('attempts')
      .update({
        status: 'SUBMITTED',
        submitted_at: now,
        score: result.score,
        max_score: result.max_score,
        percentage: result.percentage,
        correct_count: result.correct_count,
        incorrect_count: result.incorrect_count,
        skipped_count: result.skipped_count,
      })
      .eq('id', attemptId);

    if (updateError) {
      throw new Error(`Failed to persist submitted attempt to PostgreSQL: ${updateError.message}`);
    }

    // 5. Log audit trail
    await client.from('audit_logs').insert([
      {
        tenant_id: attemptRow.tenant_id,
        user_id: attemptRow.user_id,
        action: 'ATTEMPT_SUBMITTED',
        entity_type: 'attempt',
        entity_id: attemptId,
        new_data: {
          score: result.score,
          percentage: result.percentage,
          correct_count: result.correct_count,
        },
      },
    ]);

    // 6. Return fresh graded attempt
    const updated = await this.getAttemptById(attemptId, authHeader);
    if (!updated) {
      throw new Error('Failed to retrieve graded attempt from PostgreSQL');
    }
    return updated;
  }

  async getUserAttempts(userId: string, authHeader?: string): Promise<Attempt[]> {
    const client = getDbClient(authHeader);
    const { data: rows, error } = await client
      .from('attempts')
      .select('*, practice_tests(name)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load user attempts from PostgreSQL: ${error.message}`);
    }

    return (rows || []).map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      practice_test_id: row.practice_test_id,
      practice_test_name: row.practice_tests?.name,
      started_at: row.started_at,
      submitted_at: row.submitted_at,
      time_limit_seconds: row.time_limit_seconds,
      time_spent_seconds: row.time_spent_seconds,
      status: row.status,
      score: Number(row.score ?? 0),
      max_score: Number(row.max_score ?? 0),
      percentage: Number(row.percentage ?? 0),
      correct_count: row.correct_count ?? 0,
      incorrect_count: row.incorrect_count ?? 0,
      skipped_count: row.skipped_count ?? 0,
      answers: {},
    }));
  }
}

export const attemptService = new AttemptService();
