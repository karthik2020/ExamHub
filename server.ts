import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage';
import { generateFigureSequence } from './src/generator/figureSequenceEngine';
import { Attempt, AttemptAnswer, Question, UserTier } from './src/types';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // ==========================================
  // 1. TENANT MANAGEMENT APIS
  // ==========================================
  app.get('/api/tenants', (req, res) => {
    const list = Array.from(storage.tenants.values());
    res.json(list);
  });

  app.get('/api/tenants/:slug', (req, res) => {
    const { slug } = req.params;
    const tenant = Array.from(storage.tenants.values()).find((t) => t.slug === slug);
    if (!tenant) {
      return res.status(404).json({ error: `Tenant '${slug}' not found.` });
    }
    res.json(tenant);
  });

  app.put('/api/tenants/:id', (req, res) => {
    const { id } = req.params;
    const existing = storage.tenants.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }
    const updated = { ...existing, ...req.body, updated_at: new Date().toISOString() };
    storage.tenants.set(id, updated);

    storage.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenant_id: id,
      action: 'TENANT_BRANDING_UPDATED',
      entity_type: 'TENANT',
      entity_id: id,
      old_data: existing,
      new_data: updated,
      created_at: new Date().toISOString(),
    });

    res.json(updated);
  });

  // ==========================================
  // 2. CMS & NAVIGATION APIS
  // ==========================================
  app.get('/api/cms/pages', (req, res) => {
    const { tenant_id } = req.query;
    const pages = Array.from(storage.pages.values()).filter(
      (p) => !tenant_id || p.tenant_id === tenant_id
    );
    res.json(pages);
  });

  app.get('/api/cms/pages/:slug', (req, res) => {
    const { slug } = req.params;
    const page = storage.pages.get(slug);
    if (!page) {
      return res.status(404).json({ error: `Page '${slug}' not found.` });
    }
    res.json(page);
  });

  app.put('/api/cms/pages/:slug', (req, res) => {
    const { slug } = req.params;
    const existing = storage.pages.get(slug);
    if (!existing) {
      return res.status(404).json({ error: 'Page not found' });
    }
    const updated = { ...existing, ...req.body };
    storage.pages.set(slug, updated);
    res.json(updated);
  });

  app.get('/api/cms/navigation', (req, res) => {
    const { tenant_id, location } = req.query;
    let items = storage.navigation;
    if (tenant_id) {
      items = items.filter((n) => n.tenant_id === tenant_id);
    }
    if (location) {
      items = items.filter((n) => n.location === location);
    }
    res.json(items);
  });

  // ==========================================
  // 3. EXAMS, SECTIONS, & TOPICS APIS
  // ==========================================
  app.get('/api/exams', (req, res) => {
    const { tenant_id } = req.query;
    const exams = Array.from(storage.exams.values()).filter(
      (e) => !tenant_id || e.tenant_id === tenant_id
    );
    res.json(exams);
  });

  app.get('/api/exams/:id', (req, res) => {
    const exam = storage.exams.get(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  });

  app.post('/api/exams', (req, res) => {
    const newExam = {
      id: `e-${Date.now()}`,
      ...req.body,
    };
    storage.exams.set(newExam.id, newExam);
    res.status(201).json(newExam);
  });

  app.get('/api/exams/:id/sections', (req, res) => {
    const { id } = req.params;
    const sections = Array.from(storage.sections.values()).filter((s) => s.exam_id === id);
    res.json(sections);
  });

  app.get('/api/topics', (req, res) => {
    const { section_id } = req.query;
    const topics = Array.from(storage.topics.values()).filter(
      (t) => !section_id || t.section_id === section_id
    );
    res.json(topics);
  });

  // ==========================================
  // 4. PRACTICE TESTS APIS
  // ==========================================
  app.get('/api/practice-tests', (req, res) => {
    const { tenant_id, exam_id } = req.query;
    let tests = Array.from(storage.practiceTests.values()).filter((t) => t.is_published);
    if (tenant_id) tests = tests.filter((t) => t.tenant_id === tenant_id);
    if (exam_id) tests = tests.filter((t) => t.exam_id === exam_id);
    res.json(tests);
  });

  app.get('/api/practice-tests/:id', (req, res) => {
    const test = storage.practiceTests.get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Practice test not found' });
    res.json(test);
  });

  // ==========================================
  // 5. TEST ATTEMPTS & AUTHORITATIVE SCORING
  // ==========================================
  // Start a new test attempt (Enforces Access Tier + Strips correct answers from student payload)
  app.post('/api/practice-tests/start', (req, res) => {
    const { practice_test_id, user_id, tenant_id, difficulty, question_count } = req.body;
    const test = storage.practiceTests.get(practice_test_id);

    if (!test) {
      return res.status(404).json({ error: 'Practice test not found' });
    }

    const user = storage.users.get(user_id) || {
      id: user_id || 'u-guest',
      email: 'guest@dmathub.com',
      name: 'Guest Candidate',
      role: 'STUDENT',
      tier: 'GUEST' as UserTier,
      status: 'ACTIVE' as const,
    };

    let selectedQuestions: Question[] = [];

    if (test.question_selection_mode === 'GENERATED') {
      // Pro/Paid user procedural generation
      const count = Math.min(question_count || 10, 20);
      const diff = difficulty || test.difficulty === 'ALL' ? 'MEDIUM' : (test.difficulty as any);
      for (let i = 0; i < count; i++) {
        const seed = `gen-session-${Date.now()}-${i}`;
        const { question } = generateFigureSequence(
          seed,
          diff,
          test.exam_id,
          test.section_id || 's0000000-0000-0000-0000-000000000001',
          tenant_id
        );
        selectedQuestions.push(question);
      }
    } else {
      // Fixed pool selection with Access Tier Enforcement:
      // GUEST: 10 fixed questions (pool_access === 'GUEST')
      // REGISTERED: 20 fixed questions ('GUEST' + 'REGISTERED')
      // PAID: All
      const allQs = Array.from(storage.questions.values()).filter(
        (q) => q.status === 'PUBLISHED' && (!test.section_id || q.section_id === test.section_id)
      );

      let eligible = allQs;
      if (user.tier === 'GUEST') {
        eligible = allQs.filter((q) => q.pool_access === 'GUEST');
      } else if (user.tier === 'REGISTERED') {
        eligible = allQs.filter((q) => q.pool_access === 'GUEST' || q.pool_access === 'REGISTERED');
      }

      // Filter by difficulty if specified and not 'ALL'
      if (difficulty && difficulty !== 'ALL') {
        eligible = eligible.filter((q) => q.difficulty === difficulty);
      }

      const count = test.question_count || 10;
      selectedQuestions = eligible.slice(0, count);

      // If requested difficulty yielded fewer than needed, fill with available
      if (selectedQuestions.length === 0) {
        selectedQuestions = eligible.slice(0, count);
      }
    }

    const timeLimitSeconds = test.time_limit_minutes * 60;
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Store authoritative attempt on server
    const attempt: Attempt = {
      id: attemptId,
      tenant_id: tenant_id || test.tenant_id,
      user_id: user.id,
      practice_test_id: test.id,
      practice_test_name: test.name,
      started_at: new Date().toISOString(),
      time_limit_seconds: timeLimitSeconds,
      time_spent_seconds: 0,
      status: 'IN_PROGRESS',
      score: 0,
      max_score: selectedQuestions.length,
      percentage: 0,
      correct_count: 0,
      incorrect_count: 0,
      skipped_count: selectedQuestions.length,
      answers: {},
      questions: selectedQuestions, // Server keeps full questions with correct answers
    };

    storage.attempts.set(attemptId, attempt);

    // CRITICAL SECURITY: Strip correct_answer, explanation, and option is_correct before returning to client!
    const sanitizedQuestions = selectedQuestions.map((q) => ({
      ...q,
      correct_answer: undefined,
      explanation: undefined,
      solution: undefined,
      options: q.options.map((opt) => ({
        ...opt,
        is_correct: undefined,
      })),
    }));

    res.json({
      attempt_id: attempt.id,
      started_at: attempt.started_at,
      time_limit_seconds: attempt.time_limit_seconds,
      test_type: test.test_type,
      test_name: test.name,
      questions: sanitizedQuestions,
      total_questions: sanitizedQuestions.length,
    });
  });

  // Retrieve an existing attempt (e.g. on page refresh to restore session!)
  app.get('/api/attempts/:id', (req, res) => {
    const attempt = storage.attempts.get(req.params.id);
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // If attempt is still IN_PROGRESS, do NOT reveal remaining correct answers
    if (attempt.status === 'IN_PROGRESS') {
      const sanitizedQuestions = attempt.questions?.map((q) => {
        // If question was already checked/answered, we can return its grading
        const recordedAnswer = attempt.answers[q.id];
        if (recordedAnswer && recordedAnswer.is_correct !== undefined) {
          return q; // student already checked this question
        }
        return {
          ...q,
          correct_answer: undefined,
          explanation: undefined,
          solution: undefined,
          options: q.options.map((opt) => ({ ...opt, is_correct: undefined })),
        };
      });

      return res.json({
        ...attempt,
        questions: sanitizedQuestions,
      });
    }

    // If submitted, return full attempt with solutions
    res.json(attempt);
  });

  // Practice Mode: Check single answer immediately with server-side validation
  app.post('/api/attempts/:id/check-answer', (req, res) => {
    const { id } = req.params;
    const { question_id, selected_option_key, time_spent_seconds } = req.body;

    const attempt = storage.attempts.get(id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const question = attempt.questions?.find((q) => q.id === question_id);
    if (!question) return res.status(404).json({ error: 'Question not found in this attempt' });

    const isCorrect = question.correct_answer === selected_option_key;

    const answerRecord: AttemptAnswer = {
      attempt_id: id,
      question_id,
      selected_answer: selected_option_key,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
      time_spent_seconds: time_spent_seconds || 0,
      marks_awarded: isCorrect ? 1 : 0,
      explanation: question.explanation,
      solution: question.solution,
      correct_answer: question.correct_answer,
    };

    attempt.answers[question_id] = answerRecord;

    // Recalculate intermediate tally
    let correct = 0;
    let incorrect = 0;
    Object.values(attempt.answers).forEach((ans) => {
      if (ans.is_correct === true) correct++;
      else if (ans.is_correct === false) incorrect++;
    });

    attempt.correct_count = correct;
    attempt.incorrect_count = incorrect;
    attempt.score = correct;
    attempt.skipped_count = (attempt.questions?.length || 0) - (correct + incorrect);

    res.json({
      is_correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      solution: question.solution,
      attempt_stats: {
        correct: attempt.correct_count,
        incorrect: attempt.incorrect_count,
        score: attempt.score,
      },
    });
  });

  // Mock Mode: Save answer without revealing solution
  app.post('/api/attempts/:id/save-answer', (req, res) => {
    const { id } = req.params;
    const { question_id, selected_option_key, time_spent_seconds } = req.body;

    const attempt = storage.attempts.get(id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    attempt.answers[question_id] = {
      attempt_id: id,
      question_id,
      selected_answer: selected_option_key,
      answered_at: new Date().toISOString(),
      time_spent_seconds: time_spent_seconds || 0,
      marks_awarded: 0, // Calculated upon final submit
    };

    res.json({ success: true });
  });

  // Final Submit & Authoritative Server-Side Grading
  app.post('/api/attempts/:id/submit', (req, res) => {
    const { id } = req.params;
    const attempt = storage.attempts.get(id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const submitTime = new Date();
    const startTime = new Date(attempt.started_at);
    const elapsedSeconds = Math.floor((submitTime.getTime() - startTime.getTime()) / 1000);

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let totalScore = 0;

    attempt.questions?.forEach((q) => {
      const recorded = attempt.answers[q.id];
      if (!recorded || !recorded.selected_answer) {
        skippedCount++;
        attempt.answers[q.id] = {
          attempt_id: id,
          question_id: q.id,
          selected_answer: undefined,
          is_correct: false,
          time_spent_seconds: 0,
          marks_awarded: 0,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          solution: q.solution,
        };
      } else {
        const isCorrect = recorded.selected_answer === q.correct_answer;
        if (isCorrect) {
          correctCount++;
          totalScore += 1;
        } else {
          incorrectCount++;
        }
        attempt.answers[q.id].is_correct = isCorrect;
        attempt.answers[q.id].marks_awarded = isCorrect ? 1 : 0;
        attempt.answers[q.id].correct_answer = q.correct_answer;
        attempt.answers[q.id].explanation = q.explanation;
        attempt.answers[q.id].solution = q.solution;
      }
    });

    const maxScore = attempt.questions?.length || 1;
    const percentage = Number(((totalScore / maxScore) * 100).toFixed(1));

    attempt.submitted_at = submitTime.toISOString();
    attempt.time_spent_seconds = elapsedSeconds;
    attempt.status = 'SUBMITTED';
    attempt.score = totalScore;
    attempt.max_score = maxScore;
    attempt.percentage = percentage;
    attempt.correct_count = correctCount;
    attempt.incorrect_count = incorrectCount;
    attempt.skipped_count = skippedCount;

    // Log to audit trail
    storage.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenant_id: attempt.tenant_id,
      user_id: attempt.user_id,
      action: 'EXAM_ATTEMPT_SUBMITTED',
      entity_type: 'ATTEMPT',
      entity_id: attempt.id,
      new_data: {
        score: totalScore,
        percentage,
        time_spent_seconds: elapsedSeconds,
      },
      created_at: submitTime.toISOString(),
    });

    res.json(attempt);
  });

  app.get('/api/attempts/user/:userId', (req, res) => {
    const { userId } = req.params;
    const history = Array.from(storage.attempts.values())
      .filter((a) => a.user_id === userId && a.status === 'SUBMITTED')
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    res.json(history);
  });

  // ==========================================
  // 6. QUESTION GENERATOR API
  // ==========================================
  app.get('/api/generator/figure-sequence', (req, res) => {
    const seed = (req.query.seed as string) || `seed-${Date.now()}`;
    const diff = (req.query.difficulty as any) || 'MEDIUM';
    const tenantId = (req.query.tenant_id as string) || 'a0000000-0000-0000-0000-000000000001';
    const examId = 'e0000000-0000-0000-0000-000000000001';
    const sectionId = 's0000000-0000-0000-0000-000000000001';

    const result = generateFigureSequence(seed, diff, examId, sectionId, tenantId);
    res.json(result);
  });

  // ==========================================
  // 7. ADMIN PORTAL APIS
  // ==========================================
  app.get('/api/admin/overview', (req, res) => {
    const tenantId = req.query.tenant_id as string;
    const totalStudents = Array.from(storage.users.values()).filter((u) => u.role === 'STUDENT').length;
    const totalQuestions = storage.questions.size;
    const totalTests = storage.practiceTests.size;
    const totalAttempts = storage.attempts.size;

    const attemptsList = Array.from(storage.attempts.values()).filter((a) => a.status === 'SUBMITTED');
    const avgScore =
      attemptsList.length > 0
        ? (attemptsList.reduce((acc, a) => acc + a.percentage, 0) / attemptsList.length).toFixed(1)
        : '0';

    res.json({
      totalStudents,
      totalQuestions,
      totalTests,
      totalAttempts,
      avgScore,
      recentAttempts: attemptsList.slice(0, 5),
    });
  });

  app.get('/api/admin/questions', (req, res) => {
    const { section_id, difficulty } = req.query;
    let list = Array.from(storage.questions.values());
    if (section_id) list = list.filter((q) => q.section_id === section_id);
    if (difficulty) list = list.filter((q) => q.difficulty === difficulty);
    res.json(list);
  });

  app.post('/api/admin/questions', (req, res) => {
    const newQ = {
      ...req.body,
      id: req.body.id || `q-custom-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    storage.questions.set(newQ.id, newQ);

    storage.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      tenant_id: newQ.tenant_id,
      action: 'QUESTION_CREATED',
      entity_type: 'QUESTION',
      entity_id: newQ.id,
      new_data: { type: newQ.question_type, difficulty: newQ.difficulty },
      created_at: new Date().toISOString(),
    });

    res.status(201).json(newQ);
  });

  app.delete('/api/admin/questions/:id', (req, res) => {
    const { id } = req.params;
    storage.questions.delete(id);
    res.json({ success: true });
  });

  app.get('/api/admin/users', (req, res) => {
    res.json(Array.from(storage.users.values()));
  });

  app.put('/api/admin/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role, tier } = req.body;
    const user = storage.users.get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (role) user.role = role;
    if (tier) user.tier = tier;
    storage.users.set(id, user);
    res.json(user);
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    res.json(storage.auditLogs.slice(0, 50));
  });

  app.get('/api/plans', (req, res) => {
    res.json(Array.from(storage.plans.values()));
  });

  // ==========================================
  // 8. VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamHub Engine server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
