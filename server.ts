import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  verifySupabaseConnection,
  getSupabaseAdminClient,
  getDbClient,
  getRemoteSupabaseUrl,
  getSupabaseAnonKey,
  inspectJwtRole,
} from './server/supabase';
import { generateFigureSequence } from './src/generator/figureSequenceEngine';
import { resolveUserEntitlement } from './src/types/entitlements';
import { tenantService } from './server/services/tenantService';
import { cmsService } from './server/services/cmsService';
import { examService } from './server/services/examService';
import { questionService } from './server/services/questionService';
import { practiceTestService } from './server/services/practiceTestService';
import { attemptService } from './server/services/attemptService';
import { userService } from './server/services/userService';
import { adminService } from './server/services/adminService';
import { paymentService } from './server/services/paymentService';
import { getAuthenticatedUser, syncUserAndTenant, requireAuth, requireAdmin } from './server/auth';
import { GuestSessionManager } from './server/guestSession';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // ==========================================
  // CORS MIDDLEWARE (Cloud Run API + Frontend)
  // ==========================================
  const ALLOWED_ORIGINS = [
    'https://examhub-engine.ai.studio',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return false;
    const normalized = origin.trim().replace(/\/$/, '');
    if (ALLOWED_ORIGINS.includes(normalized)) return true;
    if (/^https:\/\/[a-z0-9-]+\.ai\.studio$/i.test(normalized)) return true;
    if (/^https:\/\/ais-(?:dev|pre)-[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/i.test(normalized)) return true;
    return false;
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-tenant-id, x-tenant-slug, x-demo-role, apikey'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  // Webhook raw body parser mounted before express.json() to support HMAC-SHA256 verification
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/rest') || req.path.startsWith('/auth')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // Helper to forward requests directly to remote Supabase Cloud
  async function forwardToSupabase(req: express.Request, res: express.Response) {
    try {
      const remoteBase = getRemoteSupabaseUrl();
      const targetUrl = `${remoteBase}${req.originalUrl}`;

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (v && typeof v === 'string') {
          const lower = k.toLowerCase();
          if (!['host', 'connection', 'content-length'].includes(lower)) {
            headers[k] = v;
          }
        }
      }
      if (!headers['apikey']) {
        headers['apikey'] = getSupabaseAnonKey();
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        init.body = JSON.stringify(req.body);
      }

      const upstreamRes = await fetch(targetUrl, init);
      res.status(upstreamRes.status);

      for (const [k, v] of upstreamRes.headers.entries()) {
        const lower = k.toLowerCase();
        if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(lower)) {
          res.setHeader(k, v);
        }
      }

      const text = await upstreamRes.text();
      if (upstreamRes.status === 204 || !text) {
        return res.status(upstreamRes.status).end();
      }

      const cType = upstreamRes.headers.get('content-type') || '';
      if (cType.includes('application/json')) {
        try {
          return res.json(JSON.parse(text));
        } catch {
          return res.send(text);
        }
      }
      return res.send(text);
    } catch (err: any) {
      console.error('Supabase Gateway Forwarding Error:', err);
      return res.status(502).json({ error: 'Supabase Gateway Forwarding Error: ' + err.message });
    }
  }

  // ==========================================
  // SUPABASE AUTH PROXY GATEWAY
  // ==========================================
  app.all('/auth/v1*', async (req, res) => {
    return forwardToSupabase(req, res);
  });

  // ==========================================
  // SUPABASE POSTGREST HARDENED GATEWAY
  // Least-privilege column restriction enforcement
  // ==========================================
  const PROHIBITED_ATTEMPT_UPDATE_FIELDS = [
    'score',
    'percentage',
    'correct_count',
    'incorrect_count',
    'skipped_count',
    'max_score',
    'submitted_at',
    'status',
    'tenant_id',
    'user_id',
  ];

  const PROHIBITED_ANSWER_UPDATE_FIELDS = [
    'is_correct',
    'marks_awarded',
  ];

  app.all('/rest/v1*', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const role = token ? inspectJwtRole(token) : 'anon';

    // Service-role requests have full backend authority
    if (role === 'service_role') {
      return forwardToSupabase(req, res);
    }

    // Path analysis: /rest/v1/attempts or /rest/v1/attempt_answers
    const cleanPath = req.path.replace(/^\/rest\/v1\/?/, '');
    const table = cleanPath.split('/')[0]?.split('?')[0];

    // Enforce least-privilege column update restrictions on authenticated student roles
    if (['PATCH', 'PUT'].includes(req.method)) {
      if (['subscriptions', 'payments', 'payment_events'].includes(table)) {
        return res.status(403).json({
          message: `permission denied for relation "${table}": client mutations strictly prohibited`,
          code: '42501',
          details: null,
          hint: 'Commercial state mutations can only be executed via authoritative server webhooks',
        });
      }
      if (table === 'attempts') {
        const bodyKeys = Object.keys(req.body || {}).map((k) => k.toLowerCase());
        const violatedCol = bodyKeys.find((k) => PROHIBITED_ATTEMPT_UPDATE_FIELDS.includes(k));
        if (violatedCol) {
          return res.status(403).json({
            message: `permission denied for column "${violatedCol}" of relation "attempts"`,
            code: '42501',
            details: null,
            hint: null,
          });
        }
      } else if (table === 'attempt_answers') {
        const bodyKeys = Object.keys(req.body || {}).map((k) => k.toLowerCase());
        const violatedCol = bodyKeys.find((k) => PROHIBITED_ANSWER_UPDATE_FIELDS.includes(k));
        if (violatedCol) {
          return res.status(403).json({
            message: `permission denied for column "${violatedCol}" of relation "attempt_answers"`,
            code: '42501',
            details: null,
            hint: null,
          });
        }
      }
    } else if (req.method === 'POST') {
      if (['subscriptions', 'payments', 'payment_events'].includes(table)) {
        return res.status(403).json({
          message: `permission denied for relation "${table}": direct client insertion strictly prohibited`,
          code: '42501',
          details: null,
          hint: 'Commercial state mutations can only be executed via authoritative server webhooks',
        });
      }
      if (table === 'attempts') {
        const body = req.body || {};
        if (body.score !== undefined || body.percentage !== undefined || body.status === 'SUBMITTED') {
          return res.status(403).json({
            message: 'new row violates row-level security policy for table "attempts"',
            code: '42501',
            details: null,
            hint: null,
          });
        }
      } else if (table === 'attempt_answers') {
        const body = req.body || {};
        if (body.is_correct !== undefined || body.marks_awarded !== undefined) {
          return res.status(403).json({
            message: 'new row violates row-level security policy for table "attempt_answers"',
            code: '42501',
            details: null,
            hint: null,
          });
        }
      }
    } else if (req.method === 'DELETE') {
      if (['subscriptions', 'payments', 'payment_events'].includes(table)) {
        return res.status(403).json({
          message: `permission denied for relation "${table}": client deletion strictly prohibited`,
          code: '42501',
          details: null,
          hint: 'Commercial state mutations can only be executed via authoritative server webhooks',
        });
      }
    }

    return forwardToSupabase(req, res);
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
        (req.query.tenant_slug as string) ||
        (req.headers['x-tenant-id'] as string) ||
        (req.headers['x-tenant-slug'] as string) ||
        undefined;

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
      const { email, password, name, tenant_id, tenant_slug } = req.body;

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

      const tenantKey = tenant_id || tenant_slug || (req.headers['x-tenant-id'] as string) || (req.headers['x-tenant-slug'] as string) || 'dmathub';
      // Sync into public.users and public.tenant_users
      const profile = await syncUserAndTenant(newUser, tenantKey);

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

  app.put('/api/cms/pages/:slug', requireAdmin as any, async (req, res) => {
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

  app.post('/api/exams', requireAdmin as any, async (req, res) => {
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
      const guestToken = GuestSessionManager.extractSessionToken(req);

      if (authUser) {
        // Derive user_id from verified JWT session - never trust unauthenticated client user_id
        params.user_id = authUser.id;
        const profile = await syncUserAndTenant(authUser, params.tenant_id);
        params.tenant_id = profile.tenant_id;
        params.user_tier = profile.tier;
        params.user_role = profile.role;
      } else {
        // Unauthenticated guests must NOT be allowed to assign attempts to arbitrary user accounts or fake tiers!
        delete params.user_id;
        params.user_tier = 'GUEST';
        params.user_role = 'STUDENT';
      }

      const response = await attemptService.startAttempt(params, authHeader, guestToken);

      // Attach guest session token via cookie and response header if this was a guest attempt
      if (response.guest_session_token) {
        GuestSessionManager.attachSessionToken(res, response.guest_session_token);
      }

      res.json(response);
    } catch (err: any) {
      console.error('Error starting attempt:', err.message);
      res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
  });

  // Retrieve an existing attempt (e.g. on page refresh to restore session!)
  app.get('/api/attempts/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const guestToken = GuestSessionManager.extractSessionToken(req);
      const { user: authUser } = await getAuthenticatedUser(authHeader);

      const attempt = await attemptService.getAttemptById(req.params.id, authHeader, guestToken);
      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found in PostgreSQL' });
      }

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
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Practice Mode: Check single answer immediately with server-side validation
  app.post('/api/attempts/:id/check-answer', async (req, res) => {
    try {
      const { id } = req.params;
      const { question_id, selected_option_key, time_spent_seconds } = req.body;
      const authHeader = req.headers.authorization;
      const guestToken = GuestSessionManager.extractSessionToken(req);

      const result = await attemptService.checkAnswer(
        {
          attempt_id: id,
          question_id,
          selected_option_key,
          time_spent_seconds,
        },
        authHeader,
        guestToken
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Mock Mode: Save answer without revealing solution
  app.post('/api/attempts/:id/save-answer', async (req, res) => {
    try {
      const { id } = req.params;
      const { question_id, selected_option_key, time_spent_seconds } = req.body;
      const authHeader = req.headers.authorization;
      const guestToken = GuestSessionManager.extractSessionToken(req);

      const result = await attemptService.saveAnswer(
        {
          attempt_id: id,
          question_id,
          selected_option_key,
          time_spent_seconds,
        },
        authHeader,
        guestToken
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Final Submit & Authoritative Server-Side Grading
  app.post('/api/attempts/:id/submit', async (req, res) => {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      const guestToken = GuestSessionManager.extractSessionToken(req);

      const gradedAttempt = await attemptService.submitAttempt(id, authHeader, guestToken);
      res.json(gradedAttempt);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.get('/api/attempts/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const authHeader = req.headers.authorization;
      const guestToken = GuestSessionManager.extractSessionToken(req);

      const { user: authUser } = await getAuthenticatedUser(authHeader);
      if (authUser) {
        if (authUser.id !== userId) {
          const profile = await syncUserAndTenant(authUser);
          const isAdmin = profile.role === 'SUPER_ADMIN' || profile.role === 'TENANT_ADMIN';
          if (!isAdmin) {
            return res.status(403).json({ error: 'Forbidden: You cannot view another student\'s attempt history.' });
          }
        }
      } else {
        // Unauthenticated guest: strictly disallow querying any registered user's ID
        if (userId !== '10000000-0000-0000-0000-000000000003') {
          return res.status(403).json({ error: 'Forbidden: You cannot view another student\'s attempt history.' });
        }
      }

      const history = await attemptService.getUserAttempts(userId, authHeader, guestToken);
      res.json(history);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
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
      const { tenant_id, exam_id, section_id, topic_id, difficulty, question_type, status, limit, offset } = req.query;
      const questions = await questionService.getQuestions(
        {
          tenant_id: tenant_id as string | undefined,
          exam_id: exam_id as string | undefined,
          section_id: section_id as string | undefined,
          topic_id: topic_id as string | undefined,
          difficulty: difficulty as any,
          question_type: question_type as any,
          status: status as any,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
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

  const DEFAULT_FALLBACK_PLANS = [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Free Guest',
      description: 'Evaluate core format with fixed 10 questions without registration.',
      price: 0,
      currency: 'INR',
      billing_interval: 'ONE_TIME',
      features: ['10 fixed questions', 'Single diagnostic session', 'Standard solutions', 'No registration required'],
      status: 'ACTIVE',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000002',
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Registered Member',
      description: 'Full access to 20-question fixed verified question bank with historical tracking.',
      price: 0,
      currency: 'INR',
      billing_interval: 'ONE_TIME',
      features: ['20 verified fixed questions', 'Performance analytics', 'Detailed step-by-step solutions', 'Attempt history persistence'],
      status: 'ACTIVE',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000003',
      tenant_id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Pro Unlimited Generator',
      description: 'Unlimited procedurally generated figure sequence drills with custom difficulty and length.',
      price: 2499,
      currency: 'INR',
      billing_interval: 'ONE_TIME',
      features: [
        '90-Day Full Examination Access Pass',
        'Unlimited Procedural Figure Sequence Generation',
        'Custom Difficulty Controls (Easy, Medium, Hard)',
        'Full-Length 90-Minute Timed Simulation Mocks',
        'Infinite Reproducible Seeds & Step-by-Step Graphical Solutions',
      ],
      status: 'ACTIVE',
    },
  ];

  app.get('/api/plans', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const plans = await tenantService.getPlans(tenantId, req.headers.authorization);
      if (plans && plans.length > 0) {
        return res.json(plans);
      }
      res.json(DEFAULT_FALLBACK_PLANS);
    } catch (err: any) {
      console.warn('[Server] Error fetching plans from database, returning fallback plans:', err.message);
      res.json(DEFAULT_FALLBACK_PLANS);
    }
  });

  // Current user subscription & entitlement status
  app.get('/api/subscriptions/current', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { user: authUser } = await getAuthenticatedUser(authHeader);
      const tenantId = (req.query.tenant_id as string) || undefined;
      const adminClient = getSupabaseAdminClient() || getDbClient(authHeader);

      let profile: any = null;
      let activeSub: any = null;
      let effectiveTier: any = 'GUEST';

      if (authUser) {
        profile = await syncUserAndTenant(authUser, tenantId);
        effectiveTier = profile.tier;

        const { data: subData } = await adminClient
          .from('subscriptions')
          .select('id, status, started_at, expires_at, plan_id, plans(id, name, description, price, currency, billing_interval, features)')
          .eq('tenant_id', profile.tenant_id)
          .eq('user_id', authUser.id)
          .eq('status', 'ACTIVE')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        activeSub = subData;
      }

      const resolvedTenantId = profile?.tenant_id || tenantId || 'a0000000-0000-0000-0000-000000000001';
      const plans = await tenantService.getPlans(resolvedTenantId, authHeader);
      const entitlement = resolveUserEntitlement(effectiveTier, Boolean(authUser));

      res.json({
        tier: effectiveTier,
        role: profile?.role || 'STUDENT',
        isAuthenticated: Boolean(authUser),
        subscription: activeSub,
        entitlement,
        plans,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7B. COMMERCIAL CHECKOUT & PAYMENT WEBHOOKS
  // ==========================================
  app.post('/api/checkout/create-session', requireAuth as any, async (req, res) => {
    try {
      const authUser = (req as any).user;
      const tenantId = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string) || 'a0000000-0000-0000-0000-000000000001';
      const profile = await syncUserAndTenant(authUser, tenantId);

      const { plan_id } = req.body || {};
      if (!plan_id) {
        return res.status(400).json({ error: 'plan_id is required' });
      }

      const session = await paymentService.createCheckoutSession(
        authUser.id,
        profile.tenant_id,
        plan_id,
        req.headers.authorization
      );

      res.json(session);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  app.post('/api/checkout/verify', requireAuth as any, async (req, res) => {
    try {
      const authUser = (req as any).user;
      const tenantId = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string) || 'a0000000-0000-0000-0000-000000000001';
      const profile = await syncUserAndTenant(authUser, tenantId);

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
        });
      }

      const result = await paymentService.verifyPayment(
        authUser.id,
        profile.tenant_id,
        { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      );

      res.json(result);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  app.post('/api/checkout/verify-payment', requireAuth as any, async (req, res) => {
    try {
      const authUser = (req as any).user;
      const tenantId = (req.query.tenant_id as string) || (req.headers['x-tenant-id'] as string) || 'a0000000-0000-0000-0000-000000000001';
      const profile = await syncUserAndTenant(authUser, tenantId);

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
        });
      }

      const result = await paymentService.verifyPayment(
        authUser.id,
        profile.tenant_id,
        { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      );

      res.json(result);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ error: err.message });
    }
  });

  app.get('/api/webhooks/payments', (req, res) => {
    res.json({
      status: 'active',
      service: 'ExamHub Payment Webhook Listener',
      provider: 'RAZORPAY',
      mode: 'test',
      supported_methods: ['POST'],
      supported_events: [
        'payment.captured',
        'payment.failed',
        'order.paid',
        'refund.created',
        'refund.processed',
      ],
      description: 'Authoritative payment webhook receiver for Razorpay Test Mode billing events.',
    });
  });

  app.post('/api/webhooks/payments', async (req, res) => {
    try {
      // Capture raw body string from buffer/string for cryptographic HMAC verification
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf-8')
        : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

      const signature =
        (req.headers['x-razorpay-signature'] as string) ||
        (req.headers['X-Razorpay-Signature'] as string) ||
        (req.headers['razorpay-signature'] as string);

      const eventId =
        (req.headers['x-razorpay-event-id'] as string) ||
        (req.headers['X-Razorpay-Event-Id'] as string);

      const result = await paymentService.handleWebhook(rawBody, signature, eventId);
      return res.status(result.statusCode).json(result.body);
    } catch (err: any) {
      console.error('[PaymentWebhook] Unhandled error:', err);
      return res.status(500).json({ error: 'Internal webhook error: ' + err.message });
    }
  });

  // Admin visibility endpoints for commercial state
  app.get('/api/admin/subscriptions', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const subs = await paymentService.getAdminSubscriptions(tenantId);
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/payments', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const payments = await paymentService.getAdminPayments(tenantId);
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/payment-events', requireAdmin as any, async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const events = await paymentService.getAdminPaymentEvents(tenantId);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Practice Test & Mock Exam Management
  app.post('/api/admin/practice-tests', requireAdmin as any, async (req, res) => {
    try {
      const newTest = await practiceTestService.createPracticeTest(
        req.body,
        req.body.question_ids,
        req.headers.authorization
      );
      await adminService.logAudit(
        {
          tenant_id: newTest.tenant_id,
          action: 'PRACTICE_TEST_CREATED',
          entity_type: 'PRACTICE_TEST',
          entity_id: newTest.id,
          new_data: { name: newTest.name, type: newTest.test_type, mode: newTest.question_selection_mode },
        },
        req.headers.authorization
      );
      res.status(201).json(newTest);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/practice-tests/:id', requireAdmin as any, async (req, res) => {
    try {
      const updated = await practiceTestService.updatePracticeTest(
        req.params.id,
        req.body,
        req.headers.authorization
      );
      await adminService.logAudit(
        {
          tenant_id: updated.tenant_id,
          action: 'PRACTICE_TEST_UPDATED',
          entity_type: 'PRACTICE_TEST',
          entity_id: updated.id,
          new_data: req.body,
        },
        req.headers.authorization
      );
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/practice-tests/:id', requireAdmin as any, async (req, res) => {
    try {
      const test = await practiceTestService.getPracticeTestById(req.params.id, req.headers.authorization);
      const result = await practiceTestService.deletePracticeTest(req.params.id, req.headers.authorization);
      if (test) {
        await adminService.logAudit(
          {
            tenant_id: test.tenant_id,
            action: 'PRACTICE_TEST_DELETED',
            entity_type: 'PRACTICE_TEST',
            entity_id: test.id,
          },
          req.headers.authorization
        );
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Section & Topic Configuration
  app.post('/api/admin/sections', requireAdmin as any, async (req, res) => {
    try {
      const section = await examService.createSection(req.body, req.headers.authorization);
      res.status(201).json(section);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/topics', requireAdmin as any, async (req, res) => {
    try {
      const topic = await examService.createTopic(req.body, req.headers.authorization);
      res.status(201).json(topic);
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
