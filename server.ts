import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { verifySupabaseConnection, getSupabaseAdminClient } from './server/supabase';
import { generateFigureSequence } from './src/generator/figureSequenceEngine';
import { tenantService } from './server/services/tenantService';
import { cmsService } from './server/services/cmsService';
import { examService } from './server/services/examService';
import { questionService } from './server/services/questionService';
import { practiceTestService } from './server/services/practiceTestService';
import { attemptService } from './server/services/attemptService';
import { userService } from './server/services/userService';
import { adminService } from './server/services/adminService';
import { getAuthenticatedUser, syncUserAndTenant, requireAuth, requireAdmin } from './server/auth';

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

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await verifySupabaseConnection();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // AUTHENTICATION & IDENTITY APIS
  // ==========================================
  // Get currently authenticated user profile & tenant membership derived from JWT
  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { user: authUser, error } = await getAuthenticatedUser(authHeader);

      if (!authUser || error) {
        return res.json({
          authenticated: false,
          user: null,
          error: error || 'No active session',
        });
      }

      const tenantIdOrSlug =
        (req.query.tenant_id as string) ||
        (req.headers['x-tenant-id'] as string) ||
        'dmathub';

      const profile = await syncUserAndTenant(authUser, tenantIdOrSlug);

      res.json({
        authenticated: true,
        user: profile,
        tenant: {
          id: profile.tenant_id,
          slug: profile.tenant_slug,
          student_path: profile.student_path,
        },
      });
    } catch (err: any) {
      console.error('Error in /api/auth/me:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Register a new user account with Supabase Auth
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, tenant_id } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const adminClient = getSupabaseAdminClient();
      if (!adminClient) {
        return res.status(500).json({ error: 'Supabase server administrative client not configured' });
      }

      const sanitizedEmail = email.trim().toLowerCase();
      const displayName = name ? name.trim() : sanitizedEmail.split('@')[0];

      // Create pre-confirmed user in Supabase Auth so candidate can log in immediately
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: sanitizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          role: 'STUDENT',
          tier: 'REGISTERED',
        },
      });

      if (createErr) {
        if (createErr.message.toLowerCase().includes('already registered') || createErr.message.toLowerCase().includes('duplicate')) {
          return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
        }
        return res.status(400).json({ error: createErr.message });
      }

      const newUser = createData.user;
      if (!newUser) {
        return res.status(500).json({ error: 'Failed to create auth user' });
      }

      // Sync into public.users and public.tenant_users
      const profile = await syncUserAndTenant(newUser, tenant_id || 'dmathub');

      res.status(201).json({
        success: true,
        message: 'Account registered successfully. You can now sign in.',
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          tier: profile.tier,
          tenant_id: profile.tenant_id,
          student_path: profile.student_path,
        },
      });
    } catch (err: any) {
      console.error('Error in /api/auth/register:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Password reset request
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const adminClient = getSupabaseAdminClient();
      if (!adminClient) {
        return res.status(500).json({ error: 'Supabase admin client not configured' });
      }

      // Check if user exists first to give helpful feedback
      const { data: userData } = await adminClient
        .from('users')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      // We trigger password recovery link via Supabase Auth
      const { data, error } = await adminClient.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        success: true,
        message: 'If an account matches this email, password reset instructions have been generated.',
        user_exists: Boolean(userData),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 1. TENANT MANAGEMENT APIS
  // ==========================================
  app.get('/api/tenants', async (req, res) => {
    try {
      const list = await tenantService.getAllTenants(req.headers.authorization);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tenants/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const tenant = await tenantService.getTenantBySlug(slug, req.headers.authorization);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant '${slug}' not found in PostgreSQL.` });
      }
      res.json(tenant);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tenants/:id', requireAdmin as any, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await tenantService.updateTenant(id, req.body, req.headers.authorization);
      await adminService.logAudit({
        tenant_id: id,
        action: 'TENANT_BRANDING_UPDATED',
        entity_type: 'TENANT',
        entity_id: id,
        new_data: updated,
      }, req.headers.authorization);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. CMS & NAVIGATION APIS
  // ==========================================
  app.get('/api/cms/pages', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const pages = await cmsService.getPages(tenantId, req.headers.authorization);
      res.json(pages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/cms/pages/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const tenantId = req.query.tenant_id as string | undefined;
      const page = await cmsService.getPageBySlug(slug, tenantId, req.headers.authorization);
      if (!page) {
        return res.status(404).json({ error: `Page '${slug}' not found in PostgreSQL.` });
      }
      res.json(page);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/cms/pages/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const updated = await cmsService.updatePage(slug, req.body, req.headers.authorization);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/cms/navigation', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const location = req.query.location as string | undefined;
      const items = await cmsService.getNavigation(tenantId, location, req.headers.authorization);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. EXAMS, SECTIONS, & TOPICS APIS
  // ==========================================
  app.get('/api/exams', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const exams = await examService.getExams(tenantId, req.headers.authorization);
      res.json(exams);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/exams/:id', async (req, res) => {
    try {
      const exam = await examService.getExamById(req.params.id, req.headers.authorization);
      if (!exam) return res.status(404).json({ error: 'Exam not found in PostgreSQL' });
      res.json(exam);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/exams', async (req, res) => {
    try {
      const newExam = await examService.createExam(req.body, req.headers.authorization);
      res.status(201).json(newExam);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/exams/:id/sections', async (req, res) => {
    try {
      const sections = await examService.getSectionsByExamId(req.params.id, req.headers.authorization);
      res.json(sections);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/topics', async (req, res) => {
    try {
      const sectionId = req.query.section_id as string | undefined;
      const topics = await examService.getTopics(sectionId, req.headers.authorization);
      res.json(topics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 4. PRACTICE TESTS APIS
  // ==========================================
  app.get('/api/practice-tests', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const examId = req.query.exam_id as string | undefined;
      const sectionId = req.query.section_id as string | undefined;
      const tests = await practiceTestService.getPracticeTests(
        { tenant_id: tenantId, exam_id: examId, section_id: sectionId },
        req.headers.authorization
      );
      res.json(tests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/practice-tests/:id', async (req, res) => {
    try {
      const test = await practiceTestService.getPracticeTestById(req.params.id, req.headers.authorization);
      if (!test) return res.status(404).json({ error: 'Practice test not found in PostgreSQL' });
      res.json(test);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. TEST ATTEMPTS & AUTHORITATIVE SCORING
  // ==========================================
  // Start a new test attempt (Persists to PostgreSQL attempts & attempt_answers + Strips solutions)
  app.post('/api/practice-tests/start', async (req, res) => {
    try {
      let params = { ...req.body };
      const authHeader = req.headers.authorization;
      const { user: authUser } = await getAuthenticatedUser(authHeader);

      if (authUser) {
        // Derive user_id from verified JWT session - never trust unauthenticated client user_id
        params.user_id = authUser.id;
        const profile = await syncUserAndTenant(authUser, params.tenant_id);
        params.tenant_id = profile.tenant_id;
        params.user_tier = profile.tier;
      }

      const response = await attemptService.startAttempt(params, authHeader);
      res.json(response);
    } catch (err: any) {
      console.error('Error starting attempt:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Retrieve an existing attempt (e.g. on page refresh to restore session!)
  app.get('/api/attempts/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const attempt = await attemptService.getAttemptById(req.params.id, authHeader);
      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found in PostgreSQL' });
      }

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser) {
        const profile = await syncUserAndTenant(authUser);
        const isOwner = attempt.user_id === authUser.id;
        const isAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'TENANT_ADMIN';
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to view another student\'s attempt.' });
        }
      }

      res.json(attempt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Practice Mode: Check single answer immediately with server-side validation
  app.post('/api/attempts/:id/check-answer', async (req, res) => {
    try {
      const { id } = req.params;
      const { question_id, selected_option_key, time_spent_seconds } = req.body;
      const authHeader = req.headers.authorization;

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser) {
        const attempt = await attemptService.getAttemptById(id, authHeader);
        if (attempt && attempt.user_id !== authUser.id) {
          return res.status(403).json({ error: 'Forbidden: Cannot submit answers for another student\'s attempt.' });
        }
      }

      const result = await attemptService.checkAnswer(
        {
          attempt_id: id,
          question_id,
          selected_option_key,
          time_spent_seconds,
        },
        authHeader
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mock Mode: Save answer without revealing solution
  app.post('/api/attempts/:id/save-answer', async (req, res) => {
    try {
      const { id } = req.params;
      const { question_id, selected_option_key, time_spent_seconds } = req.body;
      const authHeader = req.headers.authorization;

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser) {
        const attempt = await attemptService.getAttemptById(id, authHeader);
        if (attempt && attempt.user_id !== authUser.id) {
          return res.status(403).json({ error: 'Forbidden: Cannot save answers for another student\'s attempt.' });
        }
      }

      const result = await attemptService.saveAnswer(
        {
          attempt_id: id,
          question_id,
          selected_option_key,
          time_spent_seconds,
        },
        authHeader
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Final Submit & Authoritative Server-Side Grading
  app.post('/api/attempts/:id/submit', async (req, res) => {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser) {
        const attempt = await attemptService.getAttemptById(id, authHeader);
        if (attempt && attempt.user_id !== authUser.id) {
          return res.status(403).json({ error: 'Forbidden: Cannot submit another student\'s attempt.' });
        }
      }

      const gradedAttempt = await attemptService.submitAttempt(id, authHeader);
      res.json(gradedAttempt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/attempts/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const authHeader = req.headers.authorization;

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser && authUser.id !== userId) {
        const profile = await syncUserAndTenant(authUser);
        const isAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'TENANT_ADMIN';
        if (!isAdmin) {
          return res.status(403).json({ error: 'Forbidden: You cannot view another student\'s attempt history.' });
        }
      }

      const history = await attemptService.getUserAttempts(userId, authHeader);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. QUESTION GENERATOR API
  // ==========================================
  app.get('/api/generator/figure-sequence', (req, res) => {
    const seed = (req.query.seed as string) || `seed-${Date.now()}`;
    const diff = (req.query.difficulty as any) || 'MEDIUM';
    const tenantId = (req.query.tenant_id as string) || 'a0000000-0000-0000-0000-000000000001';
    const examId = (req.query.exam_id as string) || 'e0000000-0000-0000-0000-000000000001';
    const sectionId = (req.query.section_id as string) || 'b0000000-0000-0000-0000-000000000001';

    const result = generateFigureSequence(seed, diff, examId, sectionId, tenantId);
    res.json(result);
  });

  // ==========================================
  // 7. ADMIN PORTAL APIS (Protected by server-side role check)
  // ==========================================
  app.get('/api/admin/overview', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const overview = await adminService.getOverview(tenantId, req.headers.authorization);
      res.json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/questions', requireAdmin as any, async (req, res) => {
    try {
      const { tenant_id, exam_id, section_id, topic_id, difficulty, question_type, status } = req.query;
      const questions = await questionService.getQuestions(
        {
          tenant_id: tenant_id as string | undefined,
          exam_id: exam_id as string | undefined,
          section_id: section_id as string | undefined,
          topic_id: topic_id as string | undefined,
          difficulty: difficulty as any,
          question_type: question_type as any,
          status: status as any,
        },
        req.headers.authorization
      );
      res.json(questions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/questions', requireAdmin as any, async (req, res) => {
    try {
      const newQ = await questionService.createQuestion(req.body, req.headers.authorization);
      await adminService.logAudit({
        tenant_id: newQ.tenant_id,
        action: 'QUESTION_CREATED',
        entity_type: 'QUESTION',
        entity_id: newQ.id,
        new_data: { type: newQ.question_type, difficulty: newQ.difficulty },
      }, req.headers.authorization);
      res.status(201).json(newQ);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/questions/:id', requireAdmin as any, async (req, res) => {
    try {
      const { id } = req.params;
      await questionService.deleteQuestion(id, req.headers.authorization);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/users', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const users = await userService.getUsers(tenantId, req.headers.authorization);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:id/role', requireAdmin as any, async (req, res) => {
    try {
      const { id } = req.params;
      const { role, tier } = req.body;
      const user = await userService.updateUserRole(id, role, tier, req.headers.authorization);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/audit-logs', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const logs = await adminService.getAuditLogs(tenantId, 50, req.headers.authorization);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/plans', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const plans = await tenantService.getPlans(tenantId, req.headers.authorization);
      res.json(plans);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
