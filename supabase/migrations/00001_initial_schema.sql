-- =====================================================================
-- ExamHub Engine: Core Database Schema (PostgreSQL / Supabase)
-- Multi-Tenant Examination & Learning Management System
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, ARCHIVED
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(32) NOT NULL DEFAULT '#0f766e',
    secondary_color VARCHAR(32) NOT NULL DEFAULT '#0284c7',
    font_family VARCHAR(64) NOT NULL DEFAULT 'Inter, sans-serif',
    student_path VARCHAR(64) NOT NULL DEFAULT '/ems',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TENANT SETTINGS
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(128) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

-- 4. USERS (Profiles linked to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 5. TENANT USERS (Membership & RBAC)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'STUDENT', -- SUPER_ADMIN, TENANT_ADMIN, CONTENT_EDITOR, QUESTION_EDITOR, STUDENT
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 6. EXAMS
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- DRAFT, ACTIVE, ARCHIVED
    exam_type VARCHAR(64) NOT NULL DEFAULT 'ADMISSION', -- ADMISSION, CERTIFICATION, APTITUDE
    duration_minutes INT NOT NULL DEFAULT 60,
    passing_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- 7. EXAM SECTIONS
CREATE TABLE IF NOT EXISTS exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 1,
    time_limit_minutes INT,
    question_count INT NOT NULL DEFAULT 10,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    UNIQUE(exam_id, slug)
);

-- 8. TOPICS
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 1,
    UNIQUE(section_id, slug)
);

-- 9. QUESTION GENERATORS
CREATE TABLE IF NOT EXISTS question_generators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL, -- FIGURE_SEQUENCE, EQUATION_SOLVER, LATIN_SQUARE
    version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    question_type VARCHAR(64) NOT NULL DEFAULT 'FIGURE_SEQUENCE', 
    -- SINGLE_MCQ, MULTI_MCQ, TRUE_FALSE, NUMERICAL, TEXT, IMAGE, FIGURE_SEQUENCE, PASSAGE
    difficulty VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- EASY, MEDIUM, HARD
    question_text TEXT NOT NULL,
    question_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    solution TEXT,
    source_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL', -- MANUAL, IMPORTED, GENERATED, AI_GENERATED
    generator_type VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED', -- DRAFT, REVIEW, APPROVED, PUBLISHED, ARCHIVED
    estimated_time_seconds INT DEFAULT 120,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. QUESTION OPTIONS (for MCQ, Figure Sequence, etc.)
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_key VARCHAR(16) NOT NULL, -- 'A', 'B', 'C', 'D'
    option_text TEXT,
    option_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    display_order INT NOT NULL DEFAULT 1,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(question_id, option_key)
);

-- 12. GENERATED QUESTIONS (Reproducibility & Validation log)
CREATE TABLE IF NOT EXISTS generated_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    generator_id UUID REFERENCES question_generators(id) ON DELETE SET NULL,
    generation_seed VARCHAR(64) NOT NULL,
    generator_version VARCHAR(32) NOT NULL,
    generation_parameters JSONB NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALIDATED', -- VALIDATED, FAILED, DISCARDED
    validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. PRACTICE TESTS
CREATE TABLE IF NOT EXISTS practice_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section_id UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(32) NOT NULL DEFAULT 'PRACTICE', -- PRACTICE, MOCK, DIAGNOSTIC, CUSTOM
    difficulty VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- EASY, MEDIUM, HARD, ALL
    question_selection_mode VARCHAR(32) NOT NULL DEFAULT 'FIXED', -- FIXED, RANDOM, GENERATED, ADAPTIVE
    question_count INT NOT NULL DEFAULT 10,
    time_limit_minutes INT NOT NULL DEFAULT 15,
    attempt_limit INT DEFAULT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. PRACTICE TEST QUESTIONS
CREATE TABLE IF NOT EXISTS practice_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_test_id UUID NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 1,
    marks NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    UNIQUE(practice_test_id, question_id)
);

-- 15. ATTEMPTS
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_test_id UUID NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_limit_seconds INT NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS', 
    -- NOT_STARTED, IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, ABANDONED
    score NUMERIC(6, 2) DEFAULT 0,
    max_score NUMERIC(6, 2) DEFAULT 0,
    percentage NUMERIC(5, 2) DEFAULT 0,
    correct_count INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0
);

-- 16. ATTEMPT ANSWERS
CREATE TABLE IF NOT EXISTS attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    time_spent_seconds INT DEFAULT 0,
    marks_awarded NUMERIC(4, 2) DEFAULT 0,
    UNIQUE(attempt_id, question_id)
);

-- 17. USER TOPIC PROGRESS
CREATE TABLE IF NOT EXISTS user_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    questions_attempted INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    incorrect_answers INT NOT NULL DEFAULT 0,
    accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0,
    average_time_seconds INT NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, topic_id)
);

-- 18. STUDY PLANS
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' -- ACTIVE, COMPLETED, PAUSED
);

-- 19. STUDY PLAN ITEMS
CREATE TABLE IF NOT EXISTS study_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_type VARCHAR(64) NOT NULL, -- PRACTICE, MOCK, REVIEW
    target VARCHAR(255) NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    practice_test_id UUID REFERENCES practice_tests(id) ON DELETE SET NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ
);

-- 20. QUESTION BOOKMARKS
CREATE TABLE IF NOT EXISTS question_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- 21. PAGES (CMS)
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    meta_title VARCHAR(255),
    meta_description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED', -- DRAFT, PUBLISHED
    display_order INT NOT NULL DEFAULT 1,
    UNIQUE(tenant_id, slug)
);

-- 22. NAVIGATION ITEMS
CREATE TABLE IF NOT EXISTS navigation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location VARCHAR(32) NOT NULL DEFAULT 'HEADER', -- HEADER, FOOTER, STUDENT_SIDEBAR
    label VARCHAR(128) NOT NULL,
    url VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    is_visible BOOLEAN NOT NULL DEFAULT true
);

-- 23. PLANS
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    price NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
    billing_interval VARCHAR(32) NOT NULL DEFAULT 'MONTHLY', -- ONE_TIME, MONTHLY, ANNUAL
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
);

-- 24. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 25. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(64) NOT NULL DEFAULT 'STRIPE', -- STRIPE, RAZORPAY
    provider_payment_id VARCHAR(255),
    amount NUMERIC(8, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR SCALE & PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_tenant_exam ON questions(tenant_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_attempts_user_tenant ON attempts(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON attempts(practice_test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user ON user_topic_progress(tenant_id, user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read for published pages, navigation, active tenants
CREATE POLICY "Allow public read of active tenants" ON tenants FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Allow public read of published pages" ON pages FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "Allow public read of navigation" ON navigation_items FOR SELECT USING (is_visible = true);
CREATE POLICY "Allow public read of exams" ON exams FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Allow public read of sections" ON exam_sections FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Allow public read of topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Allow public read of published practice tests" ON practice_tests FOR SELECT USING (is_published = true);

-- Student attempts: students can read/write their own attempts
CREATE POLICY "Users access their own attempts" ON attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access their own attempt answers" ON attempt_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM attempts WHERE attempts.id = attempt_answers.attempt_id AND attempts.user_id = auth.uid())
);
CREATE POLICY "Users access their own topic progress" ON user_topic_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access their own study plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
