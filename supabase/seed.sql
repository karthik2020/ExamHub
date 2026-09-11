-- =====================================================================
-- ExamHub Engine: Seed Data (dMATHub & NISM Prep)
-- =====================================================================

-- 1. SEED TENANT 1: dMATHub
INSERT INTO tenants (
    id, slug, name, domain, status, logo_url, favicon_url, 
    primary_color, secondary_color, font_family, student_path
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'dmathub',
    'dMATHub',
    'dmathub.com',
    'ACTIVE',
    'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=128&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=32&auto=format&fit=crop&q=80',
    '#0f766e', -- teal-700
    '#0284c7', -- sky-600
    'Plus Jakarta Sans, sans-serif',
    '/ems'
) ON CONFLICT (slug) DO NOTHING;

-- 2. SEED TENANT 2: NISM Prep (Proof of Multi-Tenancy Architecture)
INSERT INTO tenants (
    id, slug, name, domain, status, logo_url, favicon_url, 
    primary_color, secondary_color, font_family, student_path
) VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'nismprep',
    'NISM Prep Hub',
    'nismprep.com',
    'ACTIVE',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&auto=format&fit=crop&q=80',
    '#1e3a8a', -- blue-900
    '#b45309', -- amber-700
    'Inter, sans-serif',
    '/portal'
) ON CONFLICT (slug) DO NOTHING;

-- 3. SEED USERS & ROLES
INSERT INTO users (id, email, name, status) VALUES 
('u0000000-0000-0000-0000-000000000001', 'admin@dmathub.com', 'System Administrator', 'ACTIVE'),
('u0000000-0000-0000-0000-000000000002', 'student@dmathub.com', 'Alexander Weber', 'ACTIVE'),
('u0000000-0000-0000-0000-000000000003', 'guest@dmathub.com', 'Guest Student', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_users (tenant_id, user_id, role, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'STUDENT', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'STUDENT', 'ACTIVE')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 4. SEED EXAM: dMAT
INSERT INTO exams (
    id, tenant_id, name, slug, description, status, exam_type, duration_minutes, passing_score, instructions
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'dMAT — Deutsche Master Admission Test',
    'dmat',
    'Standardized entrance examination for master programs at German universities assessing analytical, non-verbal abstract reasoning and quantitative capacity.',
    'ACTIVE',
    'ADMISSION',
    90,
    65.00,
    'Each question carries equal marks. No negative marking. Ensure answers are submitted within the allocated countdown window.'
) ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 5. SEED EXAM SECTIONS FOR dMAT
INSERT INTO exam_sections (id, exam_id, name, slug, description, display_order, time_limit_minutes, question_count) VALUES
('s0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Figure Sequences', 'figure-sequences', 'Identify logical 4x4 matrix visual progression across 6 sequential states.', 1, 25, 20),
('s0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Mathematical Equations', 'mathematical-equations', 'Complex algebra, modular arithmetic and symbol substitution constraints.', 2, 25, 20),
('s0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Latin Squares', 'latin-squares', 'Grid-based combinatorial deduction adhering to orthogonal uniqueness rules.', 3, 20, 15),
('s0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'General Academic Module', 'general-academic-module', 'Critical evaluation of academic abstracts, diagrammatic reasoning, and data analysis.', 4, 20, 15)
ON CONFLICT (exam_id, slug) DO NOTHING;

-- 6. SEED TOPICS
INSERT INTO topics (id, section_id, name, slug, description, display_order) VALUES
('t0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'Single Element Motion & Bounce', 'single-motion-bounce', 'Linear translation and border reflection of symbols in 4x4 grids.', 1),
('t0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'Rotational Symmetry & Inversion', 'rotational-symmetry', 'Quarter and half turn transformations paired with fill toggles.', 2),
('t0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000003', 'Multi-Symbol Interacting Sequences', 'multi-symbol-interaction', 'Multiple objects with counter-directional vectors and collision rules.', 3),
('t0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000004', 'Modular Equations & Operators', 'modular-equations', 'Modular arithmetic and unknown algebraic systems.', 4)
ON CONFLICT (section_id, slug) DO NOTHING;

-- 7. SEED QUESTION GENERATOR
INSERT INTO question_generators (
    id, tenant_id, name, type, version, configuration, status
) VALUES (
    'g0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'dMAT Figure Sequence Deterministic Engine',
    'FIGURE_SEQUENCE',
    '1.2.0',
    '{"grid_dimension": 4, "steps_total": 6, "given_steps": 4, "missing_steps": [5, 6], "distractor_count": 3, "rules_allowed": ["movement", "rotation", "bounce", "color_flip", "count_change", "shape_toggle"]}'::jsonb,
    'ACTIVE'
) ON CONFLICT DO NOTHING;

-- 8. CMS PAGES FOR dMATHub
INSERT INTO pages (id, tenant_id, slug, title, content, meta_title, meta_description, status, display_order) VALUES
('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'home', 'Welcome to dMATHub', 'Master the Deutsche Master Admission Test with deterministic figure sequence drills, timed sectional simulations, and detailed analytical breakdown.', 'dMATHub — German Master Admission Test Preparation Platform', 'Official preparation hub for the dMAT examination.', 'PUBLISHED', 1),
('p0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'about', 'About the dMAT Examination', 'The dMAT (Deutsche Master Admission Test) is a rigorous academic aptitude test used by leading European and German universities to evaluate graduate program candidates in technical, quantitative, and management disciplines.', 'About dMAT — Deutsche Master Admission Test', 'Format, eligibility, and academic objectives of the dMAT examination.', 'PUBLISHED', 2),
('p0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'exam', 'Examination Structure & Scoring', 'The examination comprises 4 core sections evaluated over 90 minutes. Section 1 covers Figure Sequences (4x4 grids), Section 2 covers Mathematical Equations, Section 3 tests Latin Squares, and Section 4 tests General Academic Logic.', 'dMAT Exam Structure, Timing & Scoring Guidelines', 'Comprehensive overview of timing, questions, and section limits.', 'PUBLISHED', 3),
('p0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'syllabus', 'Official Curriculum & Sections', 'Figure Sequences: Vector translation, cyclic rotation, topological reflection, matrix collision rules. Mathematical Equations: System constraints, operator precedence, parity preservation. Latin Squares: Distinct row/column Latin arrangements.', 'dMAT Detailed Syllabus & Topic Breakdown', 'Official section-wise curriculum for admission candidates.', 'PUBLISHED', 4),
('p0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'preparation', 'Strategic Preparation Framework', 'Begin with diagnostic evaluation in Figure Sequences. Focus on identifying rule invariants: track position first, then orientation, then fill state. Practice under strict per-question time limits (average 75 seconds).', 'Preparation Guide — How to Score in the 99th Percentile on dMAT', 'Targeted study roadmap and practice strategies for dMAT candidates.', 'PUBLISHED', 5),
('p0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'pricing', 'Access Tiers & Subscriptions', 'Choose the plan that matches your timeline. Start free as a Guest with 10 fixed questions, unlock 20 questions upon registering, or upgrade to Premium for infinite deterministic generated figure sequences.', 'Pricing & Membership Plans — dMATHub', 'Transparent pricing for dMAT candidates and test-takers.', 'PUBLISHED', 6),
('p0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'faq', 'Frequently Asked Questions', 'What is dMAT? Is calculator allowed? What is the passing cutoff? How many times can I attempt? Answers to all candidate queries.', 'dMAT FAQ — Answers to Common Questions', 'Frequently asked questions regarding dMAT admission test.', 'PUBLISHED', 7)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 9. NAVIGATION ITEMS
INSERT INTO navigation_items (tenant_id, location, label, url, display_order, is_visible) VALUES
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'Home', '/', 1, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'About dMAT', '/about', 2, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'Exam', '/exam', 3, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'Syllabus', '/syllabus', 4, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'Preparation', '/preparation', 5, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'Pricing', '/pricing', 6, true),
('a0000000-0000-0000-0000-000000000001', 'HEADER', 'FAQ', '/faq', 7, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Dashboard', '/ems/dashboard', 1, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Practice Drills', '/ems/practice', 2, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Mock Tests', '/ems/mock-tests', 3, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Analytics & Progress', '/ems/progress', 4, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Study Plan', '/ems/study-plan', 5, true),
('a0000000-0000-0000-0000-000000000001', 'STUDENT_SIDEBAR', 'Bookmarks', '/ems/bookmarks', 6, true)
ON CONFLICT DO NOTHING;

-- 10. SUBSCRIPTION PLANS
INSERT INTO plans (id, tenant_id, name, description, price, currency, billing_interval, features, status) VALUES
('pl000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Free Guest', 'Evaluate core format with fixed 10 questions without registration.', 0.00, 'EUR', 'ONE_TIME', '["10 fixed questions", "Single diagnostic session", "Standard solutions", "No registration required"]'::jsonb, 'ACTIVE'),
('pl000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Registered Member', 'Full access to 20-question fixed verified question bank with historical tracking.', 0.00, 'EUR', 'ONE_TIME', '["20 verified fixed questions", "Performance analytics", "Detailed step-by-step solutions", "Attempt history persistence"]'::jsonb, 'ACTIVE'),
('pl000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Pro Unlimited Generator', 'Unlimited procedurally generated figure sequence drills with custom difficulty and length.', 29.00, 'EUR', 'MONTHLY', '["Unlimited generated questions", "Configurable difficulty (Easy/Med/Hard)", "Custom session lengths (5 to 30 items)", "Full 90-minute timed mock tests", "Weak-topic recommendation engine"]'::jsonb, 'ACTIVE')
ON CONFLICT DO NOTHING;
