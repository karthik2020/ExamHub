import { getDbClient, getSupabaseAdminClient } from '../supabase';
import { Attempt, AttemptAnswer, Difficulty, Question, UserTier } from '../../src/types';
import { resolveUserEntitlement } from '../../src/types/entitlements';
import { practiceTestService } from './practiceTestService';
import { questionService, QuestionService } from './questionService';
import { scoringService } from './scoringService';
import { questionPluginRegistry } from '../../src/generator';
import { GuestSessionManager } from '../guestSession';

export interface StartAttemptParams {
  practice_test_id: string;
  user_id?: string;
  tenant_id?: string;
  difficulty?: Difficulty;
  question_count?: number;
  user_tier?: UserTier;
  user_role?: string;
}

export interface StartAttemptResponse {
  attempt_id: string;
  started_at: string;
  time_limit_seconds: number;
  test_type: string;
  test_name: string;
  total_questions: number;
  questions: Question[];
  guest_session_token?: string;
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

  async startAttempt(
    params: StartAttemptParams,
    authHeader?: string,
    guestSessionToken?: string
  ): Promise<StartAttemptResponse> {
    const client = getDbClient(authHeader);

    // 1. Fetch practice test (caller-scoped)
    const test = await practiceTestService.getPracticeTestById(params.practice_test_id, authHeader);
    if (!test) {
      const err: any = new Error(`Practice test '${params.practice_test_id}' not found in PostgreSQL`);
      err.statusCode = 404;
      throw err;
    }

    // Validate tenant isolation: cannot execute test across different tenant scopes
    if (params.tenant_id && test.tenant_id && params.tenant_id !== test.tenant_id) {
      const err: any = new Error(`Forbidden: Practice test does not belong to tenant '${params.tenant_id}'`);
      err.statusCode = 403;
      throw err;
    }

    // Entitlement resolution
    const userTier: UserTier = params.user_tier || (authHeader ? 'REGISTERED' : 'GUEST');
    const entitlement = resolveUserEntitlement(userTier, Boolean(authHeader));
    const isAdmin = params.user_role === 'SUPER_ADMIN' || params.user_role === 'TENANT_ADMIN';

    // Authoritative feature-level entitlement enforcement
    if (!isAdmin) {
      if (test.question_selection_mode === 'GENERATED' && !entitlement.hasProceduralGeneratorAccess) {
        const err: any = new Error(
          'Forbidden: Live procedural question generation requires an active Pro Candidate Membership.'
        );
        err.statusCode = 403;
        err.code = 'UPGRADE_REQUIRED';
        throw err;
      }

      if (test.test_type === 'MOCK') {
        if (!authHeader && userTier === 'GUEST') {
          const err: any = new Error(
            'Forbidden: Timed mock examinations require candidate account registration.'
          );
          err.statusCode = 403;
          err.code = 'REGISTRATION_REQUIRED';
          throw err;
        }
        if (!entitlement.hasTimedMockExamAccess) {
          const err: any = new Error(
            'Forbidden: Full timed mock examinations require an upgraded plan.'
          );
          err.statusCode = 403;
          err.code = 'UPGRADE_REQUIRED';
          throw err;
        }
      }
    }

    // Cap question count by tier entitlement
    const requestedCount = params.question_count || test.question_count || 10;
    const targetCount = Math.min(requestedCount, entitlement.maxQuestionsPerSession);
    const targetDifficulty = params.difficulty || (test.difficulty === 'ALL' ? 'MEDIUM' : test.difficulty);

    let selectedQuestions: Question[] = [];

    // 2. Select questions based on selection mode
    if (test.question_selection_mode === 'GENERATED') {
      const targetQuestionType = (test as any).question_type || 'FIGURE_SEQUENCE';
      const generatedList: Question[] = [];
      for (let i = 0; i < targetCount; i++) {
        const seed = `fs-live-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
        const { question } = questionPluginRegistry.generate({
          questionType: targetQuestionType,
          seed,
          difficulty: targetDifficulty as Difficulty,
          examId: test.exam_id,
          sectionId: test.section_id || '',
          tenantId: test.tenant_id,
        });
        const persistedQ = await questionService.createQuestion(question, authHeader);
        generatedList.push(persistedQ);
      }
      selectedQuestions = generatedList;
    } else {
      const mappedQuestions = await practiceTestService.getPracticeTestQuestions(test.id, authHeader);

      if (mappedQuestions.length > 0) {
        selectedQuestions = mappedQuestions.slice(0, targetCount);
      } else {
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
          selectedQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);
        }
        selectedQuestions = selectedQuestions.slice(0, targetCount);
      }
    }

    if (selectedQuestions.length === 0) {
      throw new Error(`Could not assemble questions for test '${test.name}' from PostgreSQL`);
    }

    // 3. Resolve student identity
    let effectiveUserId: string;
    let isAuthenticated = false;

    if (authHeader) {
      const { data: userData, error: userErr } = await client.auth.getUser();
      if (userErr || !userData?.user?.id) {
        throw new Error('Unauthorized: Invalid or expired authentication session');
      }
      effectiveUserId = userData.user.id;
      isAuthenticated = true;
    } else {
      // Seeded guest user placeholder
      effectiveUserId = '10000000-0000-0000-0000-000000000003';
    }

    // 4. Create attempt record in PostgreSQL
    const attemptId = crypto.randomUUID();
    const now = new Date().toISOString();
    const timeLimitSeconds = (test.time_limit_minutes || 15) * 60;

    let activeGuestToken: string | undefined;
    let attemptRow: any;

    if (isAuthenticated) {
      // Authenticated student: INSERT directly via caller-scoped client under Supabase RLS!
      // Must satisfy hardened RLS: unprivileged candidate cannot insert score/marks
      const { data, error } = await client
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
            score: null,
            max_score: null,
            percentage: null,
            correct_count: null,
            incorrect_count: null,
            skipped_count: null,
            submitted_at: null,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attempt record in PostgreSQL: ${error.message}`);
      }
      attemptRow = data;

      // Seed attempt_answers via caller-scoped client under RLS
      const answerInserts = selectedQuestions.map((q) => ({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: null,
        is_correct: null,
        started_at: now,
        time_spent_seconds: 0,
        marks_awarded: null,
      }));

      const { error: answersError } = await client
        .from('attempt_answers')
        .insert(answerInserts);

      if (answersError) {
        throw new Error(`Failed to initialize attempt answers in PostgreSQL: ${answersError.message}`);
      }
    } else {
      // Guest session: Privileged server path creates guest attempt, securely bound to high-entropy guest token
      activeGuestToken = guestSessionToken || GuestSessionManager.generateSessionToken();
      const adminClient = getSupabaseAdminClient();
      if (!adminClient) {
        throw new Error('Internal error: Server database client unavailable for guest session');
      }

      const { data, error } = await adminClient
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
            score: null,
            max_score: null,
            percentage: null,
            correct_count: null,
            incorrect_count: null,
            skipped_count: null,
            submitted_at: null,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create guest attempt record in PostgreSQL: ${error.message}`);
      }
      attemptRow = data;

      const answerInserts = selectedQuestions.map((q) => ({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: null,
        is_correct: null,
        started_at: now,
        time_spent_seconds: 0,
        marks_awarded: null,
      }));

      const { error: answersError } = await adminClient
        .from('attempt_answers')
        .insert(answerInserts);

      if (answersError) {
        throw new Error(`Failed to initialize guest attempt answers in PostgreSQL: ${answersError.message}`);
      }

      // Bind guest attempt to session hash in memory + persistent audit_logs
      await GuestSessionManager.bindGuestAttempt(attemptId, test.tenant_id, activeGuestToken);
    }

    // 5. Return sanitized candidate payload
    return {
      attempt_id: attemptId,
      started_at: attemptRow.started_at,
      time_limit_seconds: timeLimitSeconds,
      test_type: test.test_type,
      test_name: test.name,
      total_questions: selectedQuestions.length,
      questions: selectedQuestions.map((q) => this.sanitizeQuestionForCandidate(q)),
      guest_session_token: activeGuestToken,
    };
  }

  async getAttemptById(
    attemptId: string,
    authHeader?: string,
    guestSessionToken?: string
  ): Promise<Attempt | null> {
    let db: any;
    const client = getDbClient(authHeader);

    if (authHeader) {
      // Authenticated student: Read through caller-scoped client under Supabase RLS!
      // RLS guarantees students only see their own attempts
      db = client;
    } else {
      // Guest attempt: Enforce strict guest session validation
      const validation = await GuestSessionManager.validateGuestAttemptAccess(attemptId, guestSessionToken);
      if (!validation.valid) {
        const err: any = new Error(validation.error || 'Forbidden: Guest session validation failed');
        err.statusCode = validation.status;
        throw err;
      }
      const adminClient = getSupabaseAdminClient();
      if (!adminClient) {
        throw new Error('Internal error: Server database client unavailable');
      }
      db = adminClient;
    }

    // 1. Fetch attempt row
    const { data: attemptRow, error: attError } = await db
      .from('attempts')
      .select('*, practice_tests(name)')
      .eq('id', attemptId)
      .maybeSingle();

    if (attError) {
      throw new Error(`Failed to load attempt from PostgreSQL: ${attError.message}`);
    }
    if (!attemptRow) return null;

    // 2. Fetch all recorded answers with full question options
    const { data: answerRows, error: ansError } = await db
      .from('attempt_answers')
      .select('*, questions(*, question_options(*))')
      .eq('attempt_id', attemptId);

    if (ansError) {
      throw new Error(`Failed to load attempt answers from PostgreSQL: ${ansError.message}`);
    }

    const answersMap: Record<string, AttemptAnswer> = {};
    const questionsList: Question[] = [];
    const isSubmitted = attemptRow.status === 'SUBMITTED' || attemptRow.status === 'AUTO_SUBMITTED';

    // Resolve entitlement for explanation visibility
    const userTier: UserTier = attemptRow.user_id ? (authHeader ? 'REGISTERED' : 'GUEST') : 'GUEST';
    const entitlement = resolveUserEntitlement(userTier, Boolean(authHeader && attemptRow.user_id));

    for (const row of answerRows || []) {
      const qRaw = row.questions;
      let questionObj: Question | undefined;

      if (qRaw) {
        questionObj = QuestionService.formatQuestion(qRaw);
      } else if (row.question_id) {
        questionObj = (await questionService.getQuestionById(row.question_id, authHeader)) || undefined;
      }

      if (questionObj) {
        if (!isSubmitted) {
          if (row.is_correct === null) {
            questionObj = this.sanitizeQuestionForCandidate(questionObj);
          }
        } else if (!entitlement.hasDetailedStepExplanations) {
          // Unentitled users (e.g. guests) see results and correct answer key, but step-by-step solutions are gated
          questionObj = {
            ...questionObj,
            explanation: undefined,
            solution: undefined,
          };
        }
        questionsList.push(questionObj);
      }

      const showExplanation = (isSubmitted || row.is_correct !== null) && entitlement.hasDetailedStepExplanations;

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
        explanation: showExplanation ? questionObj?.explanation : undefined,
        solution: showExplanation ? questionObj?.solution : undefined,
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
    authHeader?: string,
    guestSessionToken?: string
  ): Promise<{ success: boolean }> {
    let db: any;
    const client = getDbClient(authHeader);
    const now = new Date().toISOString();

    if (authHeader) {
      // Authenticated student: Validate attempt ownership under RLS
      const { data: ownAttempt, error: ownErr } = await client
        .from('attempts')
        .select('id, user_id, status')
        .eq('id', params.attempt_id)
        .maybeSingle();

      if (ownErr || !ownAttempt) {
        const err: any = new Error('Forbidden: You do not have permission to modify answers for this attempt.');
        err.statusCode = 403;
        throw err;
      }

      if (ownAttempt.status === 'SUBMITTED' || ownAttempt.status === 'AUTO_SUBMITTED') {
        const err: any = new Error('Conflict: Cannot save answers for an already submitted attempt.');
        err.statusCode = 409;
        throw err;
      }

      db = client;
    } else {
      // Guest: Validate guest session access
      const validation = await GuestSessionManager.validateGuestAttemptAccess(params.attempt_id, guestSessionToken);
      if (!validation.valid) {
        const err: any = new Error(validation.error || 'Forbidden: Guest session validation failed');
        err.statusCode = validation.status;
        throw err;
      }
      const adminClient = getSupabaseAdminClient();
      if (!adminClient) throw new Error('Internal error: Server database client unavailable');
      db = adminClient;
    }

    const { error: ansError } = await db
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

    if (params.time_spent_seconds) {
      await db
        .from('attempts')
        .update({ time_spent_seconds: params.time_spent_seconds })
        .eq('id', params.attempt_id);
    }

    return { success: true };
  }

  async checkAnswer(
    params: { attempt_id: string; question_id: string; selected_option_key: string; time_spent_seconds?: number },
    authHeader?: string,
    guestSessionToken?: string
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

    // 1. Validate ownership / guest session access
    if (authHeader) {
      const { data: ownAttempt, error: ownErr } = await client
        .from('attempts')
        .select('id, user_id, status')
        .eq('id', params.attempt_id)
        .maybeSingle();

      if (ownErr || !ownAttempt) {
        const err: any = new Error('Forbidden: You do not have permission to check answers for this attempt.');
        err.statusCode = 403;
        throw err;
      }
    } else {
      const validation = await GuestSessionManager.validateGuestAttemptAccess(params.attempt_id, guestSessionToken);
      if (!validation.valid) {
        const err: any = new Error(validation.error || 'Forbidden: Guest session validation failed');
        err.statusCode = validation.status;
        throw err;
      }
    }

    // 2. Authoritatively fetch question from PostgreSQL (caller-scoped)
    const question = await questionService.getQuestionById(params.question_id, authHeader);
    if (!question) {
      throw new Error(`Question '${params.question_id}' not found in PostgreSQL`);
    }

    const isCorrect =
      Boolean(question.correct_answer) &&
      params.selected_option_key.trim().toUpperCase() === question.correct_answer?.trim().toUpperCase();

    const marksAwarded = isCorrect ? 1.0 : 0;
    const now = new Date().toISOString();

    // 3. Category A — Explicit Privileged Server Operation:
    // Under migration 00002 RLS, is_correct and marks_awarded are strictly forbidden to candidate role (HTTP 403 / 42501).
    // Updating them requires authoritative service_role.
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) throw new Error('Internal error: Service role client unavailable for authoritative grading');

    const { error: ansError } = await adminClient
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

    // 4. Re-aggregate intermediate counts on attempts using authoritative client
    const { data: allAnswers } = await adminClient
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

    await adminClient
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

  async submitAttempt(
    attemptId: string,
    authHeader?: string,
    guestSessionToken?: string
  ): Promise<Attempt> {
    let attemptRow: any;
    let answerRows: any[];
    const client = getDbClient(authHeader);
    const adminClient = getSupabaseAdminClient();
    if (!adminClient) throw new Error('Internal error: Service client unavailable for authoritative submission');

    // 1. Validate ownership & retrieve attempt answers
    if (authHeader) {
      // Authenticated student: Read attempt and answers via caller-scoped client under RLS
      const { data: row, error: attError } = await client
        .from('attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (attError || !row) {
        const err: any = new Error('Forbidden: You do not have permission to submit this attempt.');
        err.statusCode = 403;
        throw err;
      }
      attemptRow = row;

      const { data: aRows, error: ansError } = await client
        .from('attempt_answers')
        .select('*, questions(*, question_options(*))')
        .eq('attempt_id', attemptId);

      if (ansError) {
        throw new Error(`Failed to load answers for grading: ${ansError.message}`);
      }
      answerRows = aRows || [];
    } else {
      // Guest: Enforce guest session validation
      const validation = await GuestSessionManager.validateGuestAttemptAccess(attemptId, guestSessionToken);
      if (!validation.valid) {
        const err: any = new Error(validation.error || 'Forbidden: Guest session validation failed');
        err.statusCode = validation.status;
        throw err;
      }

      const { data: row, error: attError } = await adminClient
        .from('attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (attError || !row) {
        throw new Error(`Guest attempt '${attemptId}' not found in PostgreSQL`);
      }
      attemptRow = row;

      const { data: aRows, error: ansError } = await adminClient
        .from('attempt_answers')
        .select('*, questions(*, question_options(*))')
        .eq('attempt_id', attemptId);

      if (ansError) {
        throw new Error(`Failed to load answers for grading: ${ansError.message}`);
      }
      answerRows = aRows || [];
    }

    const questions: Question[] = [];
    const savedAnswersMap: Record<string, Partial<AttemptAnswer>> = {};

    for (const row of answerRows) {
      let qObj: Question | null = null;
      if (row.questions) {
        qObj = QuestionService.formatQuestion(row.questions);
      } else if (row.question_id) {
        qObj = await questionService.getQuestionById(row.question_id, authHeader);
      }
      if (qObj) {
        questions.push(qObj);
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

    // 3. Category A — Explicit Privileged Server Operation:
    // Update attempt_answers and attempts with authoritative evaluation using adminClient
    for (const q of questions) {
      const evalAns = result.evaluatedAnswers[q.id];
      if (evalAns) {
        await adminClient
          .from('attempt_answers')
          .update({
            is_correct: evalAns.is_correct,
            marks_awarded: evalAns.marks_awarded,
          })
          .eq('attempt_id', attemptId)
          .eq('question_id', q.id);
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await adminClient
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

    // 4. Log audit trail
    await adminClient.from('audit_logs').insert([
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

    // 5. Return fresh graded attempt
    const updated = await this.getAttemptById(attemptId, authHeader, guestSessionToken);
    if (!updated) {
      throw new Error('Failed to retrieve graded attempt from PostgreSQL');
    }
    return updated;
  }

  async getUserAttempts(
    userId: string,
    authHeader?: string,
    guestSessionToken?: string
  ): Promise<Attempt[]> {
    if (authHeader) {
      // Authenticated student: Query using caller-scoped client under Supabase RLS!
      // RLS automatically enforces that the student can only view their own attempts
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

    // Guest: Strict session isolation. DO NOT return all attempts for the shared guest user!
    // Only return attempts bound to the specific guest's session token.
    if (!guestSessionToken || guestSessionToken.trim().length === 0) {
      return [];
    }

    const sessionAttemptIds = await GuestSessionManager.getGuestSessionAttemptIds(guestSessionToken);
    if (sessionAttemptIds.length === 0) {
      return [];
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) return [];

    const { data: rows, error } = await adminClient
      .from('attempts')
      .select('*, practice_tests(name)')
      .in('id', sessionAttemptIds)
      .order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load guest session attempts from PostgreSQL: ${error.message}`);
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
