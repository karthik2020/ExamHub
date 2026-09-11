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
    '#0f766e',
    '#0284c7',
    'Plus Jakarta Sans, sans-serif',
    '/ems'
) ON CONFLICT (slug) DO NOTHING;

-- 2. SEED TENANT 2: NISM Prep (Multi-Tenancy Proof)
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
    '#1e3a8a',
    '#b45309',
    'Inter, sans-serif',
    '/portal'
) ON CONFLICT (slug) DO NOTHING;

-- 3. SEED USERS & ROLES
INSERT INTO users (id, email, name, status) VALUES 
('10000000-0000-0000-0000-000000000001', 'admin@dmathub.com', 'System Administrator', 'ACTIVE'),
('10000000-0000-0000-0000-000000000002', 'student@dmathub.com', 'Alexander Weber', 'ACTIVE'),
('10000000-0000-0000-0000-000000000003', 'guest@dmathub.com', 'Guest Student', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_users (tenant_id, user_id, role, status) VALUES
('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'STUDENT', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'STUDENT', 'ACTIVE')
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
('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Figure Sequences', 'figure-sequences', 'Identify logical 4x4 matrix visual progression across 6 sequential states.', 1, 25, 20),
('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Mathematical Equations', 'mathematical-equations', 'Complex algebra, modular arithmetic and symbol substitution constraints.', 2, 25, 20),
('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'Latin Squares', 'latin-squares', 'Grid-based combinatorial deduction adhering to orthogonal uniqueness rules.', 3, 20, 15),
('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'General Academic Module', 'general-academic-module', 'Critical evaluation of academic abstracts, diagrammatic reasoning, and data analysis.', 4, 20, 15)
ON CONFLICT (exam_id, slug) DO NOTHING;

-- 6. SEED TOPICS
INSERT INTO topics (id, section_id, name, slug, description, display_order) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Single Element Motion & Bounce', 'single-motion-bounce', 'Linear translation and border reflection of symbols in 4x4 grids.', 1),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Rotational Symmetry & Inversion', 'rotational-symmetry', 'Quarter and half turn transformations paired with fill toggles.', 2),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Multi-Symbol Interacting Sequences', 'multi-symbol-interaction', 'Multiple objects with counter-directional vectors and collision rules.', 3),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Modular Equations & Operators', 'modular-equations', 'Modular arithmetic and unknown algebraic systems.', 4)
ON CONFLICT (section_id, slug) DO NOTHING;

-- 7. SEED QUESTION GENERATOR
INSERT INTO question_generators (
    id, tenant_id, name, type, version, configuration, status
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'dMAT Figure Sequence Deterministic Engine',
    'FIGURE_SEQUENCE',
    '1.2.0',
    '{"grid_dimension": 4, "steps_total": 6, "given_steps": 4, "missing_steps": [5, 6], "distractor_count": 3, "rules_allowed": ["movement", "rotation", "bounce", "color_flip", "count_change", "shape_toggle"]}'::jsonb,
    'ACTIVE'
) ON CONFLICT DO NOTHING;

-- 8. PRACTICE TEST
INSERT INTO practice_tests (
    id, tenant_id, exam_id, section_id, name, description, test_type, difficulty, question_count, time_limit_minutes, is_published
) VALUES (
    'e2000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'dMAT Diagnostic Figure Sequence Drill',
    'Official diagnostic assessment targeting 4x4 matrix figure progression rules.',
    'PRACTICE',
    'MEDIUM',
    10,
    15,
    true
) ON CONFLICT DO NOTHING;

-- 9. QUESTIONS & OPTIONS

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'EASY',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":1,"col":0,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":1,"col":2,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":1,"col":3,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]}],"ruleType":"bounce","ruleDescription":"The star begins moving horizontally across row 2, reversing direction (bouncing) whenever it reaches a boundary.","stepExplanations":["Step 1: Symbols located at (2,1) [star, 0°]","Step 2: Symbols located at (2,2) [star, 0°]","Step 3: Symbols located at (2,3) [star, 0°]","Step 4: Symbols located at (2,4) [star, 0°]","Step 5: Symbols located at (2,3) [star, 0°]","Step 6: Symbols located at (2,2) [star, 0°]"]}'::jsonb,
    'B',
    'Logical Rule Analysis:
The star begins moving horizontally across row 2, reversing direction (bouncing) whenever it reaches a boundary.

• Step 5 Projection: Step 5: Symbols located at (2,3) [star, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [star, 0°]

Therefore, Choice B correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option B matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    60    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":2,"col":2,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    2,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"star","fill":"filled","rotation":90,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"star","fill":"filled","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"star","fill":"striped","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'EASY',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":90,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":180,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":270,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":90,"color":"#0f766e"}]}],"ruleType":"rotation","ruleDescription":"The cross remains centered at (2, 2) while rotating 90° clockwise at each step.","stepExplanations":["Step 1: Symbols located at (2,2) [cross, 0°]","Step 2: Symbols located at (2,2) [cross, 90°]","Step 3: Symbols located at (2,2) [cross, 180°]","Step 4: Symbols located at (2,2) [cross, 270°]","Step 5: Symbols located at (2,2) [cross, 0°]","Step 6: Symbols located at (2,2) [cross, 90°]"]}'::jsonb,
    'D',
    'Logical Rule Analysis:
The cross remains centered at (2, 2) while rotating 90° clockwise at each step.

• Step 5 Projection: Step 5: Symbols located at (2,2) [cross, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [cross, 90°]

Therefore, Choice D correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option D matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    60    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000002',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":2,"col":1,"shape":"cross","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"cross","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000002',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":1,"shape":"cross","fill":"filled","rotation":90,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"cross","fill":"filled","rotation":180,"color":"#0f766e"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000007',
    '20000000-0000-0000-0000-000000000002',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":3,"shape":"cross","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"cross","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000008',
    '20000000-0000-0000-0000-000000000002',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"cross","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    4,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'EASY',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":2,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":3,"col":3,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]}],"ruleType":"movement","ruleDescription":"The circle translates diagonally down-right (+1 row, +1 column) cyclically wrapping inside the 4x4 matrix.","stepExplanations":["Step 1: Symbols located at (1,1) [circle, 0°]","Step 2: Symbols located at (2,2) [circle, 0°]","Step 3: Symbols located at (3,3) [circle, 0°]","Step 4: Symbols located at (4,4) [circle, 0°]","Step 5: Symbols located at (1,1) [circle, 0°]","Step 6: Symbols located at (2,2) [circle, 0°]"]}'::jsonb,
    'A',
    'Logical Rule Analysis:
The circle translates diagonally down-right (+1 row, +1 column) cyclically wrapping inside the 4x4 matrix.

• Step 5 Projection: Step 5: Symbols located at (1,1) [circle, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [circle, 0°]

Therefore, Choice A correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option A matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    60    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000009',
    '20000000-0000-0000-0000-000000000003',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    1,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000003',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000003',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"filled","rotation":90,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"circle","fill":"filled","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000003',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"circle","fill":"outline","rotation":0,"color":"#0f766e"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'MEDIUM',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":0,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-0-1","row":0,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":0,"col":1,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-1-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":0,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-2-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":180,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":0,"col":3,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-3-1","row":3,"col":2,"shape":"diamond","fill":"outline","rotation":270,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}],"ruleType":"composite","ruleDescription":"Two interacting symbols: circle travels clockwise around the outer perimeter of the 4x4 grid by 1 unit per step, while diamond oscillates vertically in column 3.","stepExplanations":["Step 1: Symbols located at (1,1) [circle, 0°] and (1,3) [diamond, 0°]","Step 2: Symbols located at (1,2) [circle, 0°] and (2,3) [diamond, 90°]","Step 3: Symbols located at (1,3) [circle, 0°] and (3,3) [diamond, 180°]","Step 4: Symbols located at (1,4) [circle, 0°] and (4,3) [diamond, 270°]","Step 5: Symbols located at (1,1) [circle, 0°] and (3,3) [diamond, 0°]","Step 6: Symbols located at (1,2) [circle, 0°] and (2,3) [diamond, 90°]"]}'::jsonb,
    'D',
    'Logical Rule Analysis:
Two interacting symbols: circle travels clockwise around the outer perimeter of the 4x4 grid by 1 unit per step, while diamond oscillates vertically in column 3.

• Step 5 Projection: Step 5: Symbols located at (1,1) [circle, 0°] and (3,3) [diamond, 0°]
• Step 6 Projection: Step 6: Symbols located at (1,2) [circle, 0°] and (2,3) [diamond, 90°]

Therefore, Choice D correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option D matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000004',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":3,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000014',
    '20000000-0000-0000-0000-000000000004',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"filled","rotation":90,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"circle","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"filled","rotation":180,"color":"#0284c7"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000015',
    '20000000-0000-0000-0000-000000000004',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":0,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":3,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":0,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000016',
    '20000000-0000-0000-0000-000000000004',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"circle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    4,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'MEDIUM',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":0,"col":0,"shape":"diamond","fill":"filled","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":2,"col":2,"shape":"diamond","fill":"filled","rotation":180,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":3,"col":3,"shape":"diamond","fill":"outline","rotation":270,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"diamond","fill":"filled","rotation":0,"color":"#0f766e"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]}],"ruleType":"composite","ruleDescription":"The diamond moves along the diagonal (+1, +1) while rotating 90° clockwise and toggling between filled and outline at each step.","stepExplanations":["Step 1: Symbols located at (1,1) [diamond, 0°]","Step 2: Symbols located at (2,2) [diamond, 90°]","Step 3: Symbols located at (3,3) [diamond, 180°]","Step 4: Symbols located at (4,4) [diamond, 270°]","Step 5: Symbols located at (1,1) [diamond, 0°]","Step 6: Symbols located at (2,2) [diamond, 90°]"]}'::jsonb,
    'B',
    'Logical Rule Analysis:
The diamond moves along the diagonal (+1, +1) while rotating 90° clockwise and toggling between filled and outline at each step.

• Step 5 Projection: Step 5: Symbols located at (1,1) [diamond, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [diamond, 90°]

Therefore, Choice B correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option B matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000017',
    '20000000-0000-0000-0000-000000000005',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"diamond","fill":"filled","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000018',
    '20000000-0000-0000-0000-000000000005',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"diamond","fill":"filled","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    2,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000019',
    '20000000-0000-0000-0000-000000000005',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"diamond","fill":"filled","rotation":180,"color":"#0f766e"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000020',
    '20000000-0000-0000-0000-000000000005',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":2,"shape":"diamond","fill":"filled","rotation":0,"color":"#0f766e"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"diamond","fill":"outline","rotation":90,"color":"#0f766e"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'HARD',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-0-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-0-2","row":0,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-1-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-1-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":180,"color":"#0f766e"},{"id":"sym-2-1","row":2,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-2-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":270,"color":"#0f766e"},{"id":"sym-3-1","row":3,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-3-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}],"ruleType":"composite","ruleDescription":"Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.","stepExplanations":["Step 1: Symbols located at (2,1) [triangle, 0°] and (1,3) [circle, 0°] and (1,4) [cross, 0°]","Step 2: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]","Step 3: Symbols located at (2,3) [triangle, 180°] and (3,3) [circle, 0°] and (3,4) [cross, 0°]","Step 4: Symbols located at (2,4) [triangle, 270°] and (4,3) [circle, 0°] and (4,4) [cross, 0°]","Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]","Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]"]}'::jsonb,
    'D',
    'Logical Rule Analysis:
Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.

• Step 5 Projection: Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]

Therefore, Choice D correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option D matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    120    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000021',
    '20000000-0000-0000-0000-000000000006',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":2,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":2,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000022',
    '20000000-0000-0000-0000-000000000006',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"filled","rotation":90,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"outline","rotation":180,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":90,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000023',
    '20000000-0000-0000-0000-000000000006',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000024',
    '20000000-0000-0000-0000-000000000006',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    4,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'MEDIUM',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":0,"col":0,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-0-1","row":0,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":0,"col":1,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-1-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":0,"col":2,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-2-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":180,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":0,"col":3,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-3-1","row":3,"col":2,"shape":"diamond","fill":"outline","rotation":270,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}],"ruleType":"composite","ruleDescription":"Two interacting symbols: square travels clockwise around the outer perimeter of the 4x4 grid by 1 unit per step, while diamond oscillates vertically in column 3.","stepExplanations":["Step 1: Symbols located at (1,1) [square, 0°] and (1,3) [diamond, 0°]","Step 2: Symbols located at (1,2) [square, 0°] and (2,3) [diamond, 90°]","Step 3: Symbols located at (1,3) [square, 0°] and (3,3) [diamond, 180°]","Step 4: Symbols located at (1,4) [square, 0°] and (4,3) [diamond, 270°]","Step 5: Symbols located at (1,1) [square, 0°] and (3,3) [diamond, 0°]","Step 6: Symbols located at (1,2) [square, 0°] and (2,3) [diamond, 90°]"]}'::jsonb,
    'C',
    'Logical Rule Analysis:
Two interacting symbols: square travels clockwise around the outer perimeter of the 4x4 grid by 1 unit per step, while diamond oscillates vertically in column 3.

• Step 5 Projection: Step 5: Symbols located at (1,1) [square, 0°] and (3,3) [diamond, 0°]
• Step 6 Projection: Step 6: Symbols located at (1,2) [square, 0°] and (2,3) [diamond, 90°]

Therefore, Choice C correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option C matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000025',
    '20000000-0000-0000-0000-000000000007',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":3,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000026',
    '20000000-0000-0000-0000-000000000007',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"square","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"filled","rotation":90,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"square","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"filled","rotation":180,"color":"#0284c7"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000027',
    '20000000-0000-0000-0000-000000000007',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":0,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":2,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":1,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    3,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000028',
    '20000000-0000-0000-0000-000000000007',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":0,"col":2,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":2,"col":0,"shape":"diamond","fill":"outline","rotation":0,"color":"#0284c7"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":0,"col":3,"shape":"square","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":0,"shape":"diamond","fill":"outline","rotation":90,"color":"#0284c7"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'HARD',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-0-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-0-2","row":0,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-1-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-1-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":180,"color":"#0f766e"},{"id":"sym-2-1","row":2,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-2-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":270,"color":"#0f766e"},{"id":"sym-3-1","row":3,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-3-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}],"ruleType":"composite","ruleDescription":"Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.","stepExplanations":["Step 1: Symbols located at (2,1) [triangle, 0°] and (1,3) [circle, 0°] and (1,4) [cross, 0°]","Step 2: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]","Step 3: Symbols located at (2,3) [triangle, 180°] and (3,3) [circle, 0°] and (3,4) [cross, 0°]","Step 4: Symbols located at (2,4) [triangle, 270°] and (4,3) [circle, 0°] and (4,4) [cross, 0°]","Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]","Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]"]}'::jsonb,
    'A',
    'Logical Rule Analysis:
Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.

• Step 5 Projection: Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]

Therefore, Choice A correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option A matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    120    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000029',
    '20000000-0000-0000-0000-000000000008',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    1,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000030',
    '20000000-0000-0000-0000-000000000008',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":2,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":2,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000031',
    '20000000-0000-0000-0000-000000000008',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"filled","rotation":90,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"outline","rotation":180,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":90,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]}}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000032',
    '20000000-0000-0000-0000-000000000008',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'FIGURE_SEQUENCE',
    'HARD',
    'Analyze the sequential pattern across Grids 1 to 4. Deduce the governing mathematical/spatial transformation rules and identify the correct consecutive pair for Grid 5 and Grid 6.',
    '{"dimension":4,"totalSteps":6,"givenSteps":4,"missingSteps":[5,6],"steps":[{"dimension":4,"symbols":[{"id":"sym-0-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-0-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-0-2","row":0,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-1-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-1-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-1-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-2-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":180,"color":"#0f766e"},{"id":"sym-2-1","row":2,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-2-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-3-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":270,"color":"#0f766e"},{"id":"sym-3-1","row":3,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-3-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}],"ruleType":"composite","ruleDescription":"Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.","stepExplanations":["Step 1: Symbols located at (2,1) [triangle, 0°] and (1,3) [circle, 0°] and (1,4) [cross, 0°]","Step 2: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]","Step 3: Symbols located at (2,3) [triangle, 180°] and (3,3) [circle, 0°] and (3,4) [cross, 0°]","Step 4: Symbols located at (2,4) [triangle, 270°] and (4,3) [circle, 0°] and (4,4) [cross, 0°]","Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]","Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]"]}'::jsonb,
    'C',
    'Logical Rule Analysis:
Multi-rule system: Symbol 1 (triangle) bounces horizontally while rotating 90°; Symbol 2 (circle) translates vertically with alternating fill state; Symbol 3 (cross) steps counter-clockwise along the corners.

• Step 5 Projection: Step 5: Symbols located at (2,3) [triangle, 0°] and (1,3) [circle, 0°] and (3,4) [cross, 0°]
• Step 6 Projection: Step 6: Symbols located at (2,2) [triangle, 90°] and (2,3) [circle, 0°] and (2,4) [cross, 0°]

Therefore, Choice C correctly provides both required 4x4 matrix states.',
    'Examine the transition from Grid 1 through Grid 4:
1. Observe coordinate shifts of each symbol in the 4x4 boundary.
2. Note direction invariance and boundary condition.
3. Extrapolating to step 5 produces Grid 5, and subsequent extrapolation produces Grid 6. Only Option C matches.',
    'GENERATED',
    'FIGURE_SEQUENCE',
    'PUBLISHED',
    120    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000033',
    '20000000-0000-0000-0000-000000000009',
    'A',
    'Option A: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":2,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":3,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":2,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":2,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000034',
    '20000000-0000-0000-0000-000000000009',
    'B',
    'Option B: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"outline","rotation":90,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"filled","rotation":90,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"outline","rotation":180,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"outline","rotation":90,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"filled","rotation":90,"color":"#d97706"}]}}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000035',
    '20000000-0000-0000-0000-000000000009',
    'C',
    'Option C: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":2,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":2,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":1,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":2,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":3,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    3,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000036',
    '20000000-0000-0000-0000-000000000009',
    'D',
    'Option D: Grid 5 & Grid 6 Pair',
    '{"grid5":{"dimension":4,"symbols":[{"id":"sym-4-0","row":1,"col":0,"shape":"triangle","fill":"filled","rotation":0,"color":"#0f766e"},{"id":"sym-4-1","row":0,"col":0,"shape":"circle","fill":"outline","rotation":0,"color":"#0284c7"},{"id":"sym-4-2","row":2,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]},"grid6":{"dimension":4,"symbols":[{"id":"sym-5-0","row":1,"col":3,"shape":"triangle","fill":"filled","rotation":90,"color":"#0f766e"},{"id":"sym-5-1","row":1,"col":0,"shape":"circle","fill":"filled","rotation":0,"color":"#0284c7"},{"id":"sym-5-2","row":1,"col":1,"shape":"cross","fill":"striped","rotation":0,"color":"#d97706"}]}}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000004',
    'SINGLE_MCQ',
    'EASY',
    'Given the system: 3x + 2y = 19 and 2x - y = 8. What is the value of 5x + y?',
    '{}'::jsonb,
    'B',
    'Multiply the second equation by 2: 4x - 2y = 16. Adding to the first: 7x = 35 => x = 5. Substituting back: 2(5) - y = 8 => y = 2. Hence, 5x + y = 5(5) + 2 = 27.',
    'Step 1: Eliminate y by scalar multiplication. Step 2: Obtain x=5, y=2. Step 3: Compute 5(5)+2 = 27.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    60    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000037',
    '20000000-0000-0000-0000-000000000010',
    'A',
    '24',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000038',
    '20000000-0000-0000-0000-000000000010',
    'B',
    '27',
    '{}'::jsonb,
    2,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000039',
    '20000000-0000-0000-0000-000000000010',
    'C',
    '29',
    '{}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000040',
    '20000000-0000-0000-0000-000000000010',
    'D',
    '31',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    'SINGLE_MCQ',
    'MEDIUM',
    'If a ⋆ b = (a² - b²) / (a + b) for all a ≠ -b, compute: (12 ⋆ 4) ⋆ (9 ⋆ 3).',
    '{}'::jsonb,
    'C',
    'Since (a² - b²) / (a + b) = (a - b)(a + b) / (a + b) = a - b. Therefore: 12 ⋆ 4 = 12 - 4 = 8, and 9 ⋆ 3 = 9 - 3 = 6. Finally: 8 ⋆ 6 = 8 - 6 = 2.',
    'Factor the algebraic identity: a ⋆ b simplifies directly to (a - b). 8 ⋆ 6 = 2.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    75    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000041',
    '20000000-0000-0000-0000-000000000011',
    'A',
    '1',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000042',
    '20000000-0000-0000-0000-000000000011',
    'B',
    '4',
    '{}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000043',
    '20000000-0000-0000-0000-000000000011',
    'C',
    '2',
    '{}'::jsonb,
    3,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000044',
    '20000000-0000-0000-0000-000000000011',
    'D',
    '6',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    'SINGLE_MCQ',
    'MEDIUM',
    'In a 4x4 Latin Square with symbols {1, 2, 3, 4}, each row and each column must contain each symbol exactly once. If Row 1 is [1, 2, 3, 4], Row 2 is [2, 1, 4, 3], and Row 3 starts with [3, 4, ?, ?], which value MUST occupy position (3, 3)?',
    '{}'::jsonb,
    'A',
    'Column 3 already contains 3 (from Row 1) and 4 (from Row 2). The remaining symbols available for Column 3 are {1, 2}. Row 3 already contains 3 and 4 in columns 1 and 2. Because Column 4 already has 4 and 3 in rows 1 and 2, position (3,3) must be 1 to preserve Latin square uniqueness across Row 4.',
    'Column 3 requires {1, 2}. Cross-checking orthogonal constraints fixes (3, 3) to 1.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000045',
    '20000000-0000-0000-0000-000000000012',
    'A',
    '1',
    '{}'::jsonb,
    1,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000046',
    '20000000-0000-0000-0000-000000000012',
    'B',
    '2',
    '{}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000047',
    '20000000-0000-0000-0000-000000000012',
    'C',
    '3',
    '{}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000048',
    '20000000-0000-0000-0000-000000000012',
    'D',
    '4',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000013',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000004',
    NULL,
    'SINGLE_MCQ',
    'MEDIUM',
    'Academic deduction: In a clinical cohort study, "Every participant with phenotype alpha exhibited biomarker gamma. No participant with biomarker gamma tested positive for antibody delta." Which conclusion logically follows?',
    '{}'::jsonb,
    'D',
    'Let A = alpha, G = gamma, D = antibody delta. Statement 1: A ⊆ G. Statement 2: G ∩ D = ∅. Therefore, A ∩ D = ∅ (No participant with phenotype alpha tested positive for antibody delta).',
    'Standard categorical syllogism: All A are G. No G are D. Therefore, No A are D.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    70    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000049',
    '20000000-0000-0000-0000-000000000013',
    'A',
    'Some participants with antibody delta exhibit phenotype alpha.',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000050',
    '20000000-0000-0000-0000-000000000013',
    'B',
    'All participants with biomarker gamma exhibit phenotype alpha.',
    '{}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000051',
    '20000000-0000-0000-0000-000000000013',
    'C',
    'Biomarker gamma causes resistance to antibody delta.',
    '{}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000052',
    '20000000-0000-0000-0000-000000000013',
    'D',
    'No participant with phenotype alpha tested positive for antibody delta.',
    '{}'::jsonb,
    4,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000014',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    'SINGLE_MCQ',
    'HARD',
    'For positive integers a, b, c, if a × b = 48, b × c = 72, and a × c = 96, determine the value of a + b + c.',
    '{}'::jsonb,
    'B',
    'Multiply all three equations: (a × b × c)² = 48 × 72 × 96 = (16 × 3) × (9 × 8) × (16 × 6) = 331,776. So a × b × c = 576. Then c = (abc)/(ab) = 576/48 = 12. a = (abc)/(bc) = 576/72 = 8. b = (abc)/(ac) = 576/96 = 6. a + b + c = 8 + 6 + 12 = 26.',
    'Multiply the pairwise products to extract (abc)², then divide individually: a=8, b=6, c=12. Sum = 26.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000053',
    '20000000-0000-0000-0000-000000000014',
    'A',
    '24',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000054',
    '20000000-0000-0000-0000-000000000014',
    'B',
    '26',
    '{}'::jsonb,
    2,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000055',
    '20000000-0000-0000-0000-000000000014',
    'C',
    '28',
    '{}'::jsonb,
    3,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000056',
    '20000000-0000-0000-0000-000000000014',
    'D',
    '30',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000015',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    'SINGLE_MCQ',
    'HARD',
    'A 5x5 Latin Square uses symbols {A, B, C, D, E}. If the main diagonal consists solely of symbol A, which of the following statements MUST be true?',
    '{}'::jsonb,
    'C',
    'A Latin Square in which the main diagonal entries are all identical is an idempotent quasigroup (or idempotent Latin square). No other entry in any row or column can be A because each row and column already contains A on the diagonal.',
    'Since each row i contains A at column i, symbol A appears 0 times in non-diagonal cells.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    90    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000057',
    '20000000-0000-0000-0000-000000000015',
    'A',
    'Symbol B must occupy all anti-diagonal cells.',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000058',
    '20000000-0000-0000-0000-000000000015',
    'B',
    'The matrix must be symmetric about the diagonal.',
    '{}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000059',
    '20000000-0000-0000-0000-000000000015',
    'C',
    'Symbol A appears zero times in any off-diagonal position.',
    '{}'::jsonb,
    3,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000060',
    '20000000-0000-0000-0000-000000000015',
    'D',
    'Every row sum of indices must be prime.',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO questions (
    id, tenant_id, exam_id, section_id, topic_id, question_type, difficulty,
    question_text, question_data, correct_answer, explanation, solution,
    source_type, generator_type, status, estimated_time_seconds
) VALUES (
    '20000000-0000-0000-0000-000000000016',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000004',
    NULL,
    'SINGLE_MCQ',
    'MEDIUM',
    'Data Sufficiency: Is integer n divisible by 12?
Statement (1): n is divisible by 4.
Statement (2): n is divisible by 6.',
    '{}'::jsonb,
    'C',
    'Statement (1) alone: n could be 4 (not divisible by 12) or 12 (divisible). Insufficient. Statement (2) alone: n could be 6 (not divisible by 12) or 12 (divisible). Insufficient. Together: n is a common multiple of 4 and 6. The LCM of 4 and 6 is 12. Therefore, any common multiple of 4 and 6 must be a multiple of 12. Together sufficient.',
    'LCM(4, 6) = 12. Combining both statements guarantees n is a multiple of 12.',
    'MANUAL',
    NULL,
    'PUBLISHED',
    75    ) ON CONFLICT DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000061',
    '20000000-0000-0000-0000-000000000016',
    'A',
    'Statement (1) ALONE is sufficient, but Statement (2) is not.',
    '{}'::jsonb,
    1,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000062',
    '20000000-0000-0000-0000-000000000016',
    'B',
    'Statement (2) ALONE is sufficient, but Statement (1) is not.',
    '{}'::jsonb,
    2,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000063',
    '20000000-0000-0000-0000-000000000016',
    'C',
    'BOTH statements TOGETHER are sufficient, but NEITHER alone is sufficient.',
    '{}'::jsonb,
    3,
    true
) ON CONFLICT (question_id, option_key) DO NOTHING;

INSERT INTO question_options (
    id, question_id, option_key, option_text, option_data, display_order, is_correct
) VALUES (
    '30000000-0000-0000-0000-000000000064',
    '20000000-0000-0000-0000-000000000016',
    'D',
    'Statements (1) and (2) TOGETHER are NOT sufficient.',
    '{}'::jsonb,
    4,
    false
) ON CONFLICT (question_id, option_key) DO NOTHING;

-- 10. CMS PAGES FOR dMATHub
INSERT INTO pages (id, tenant_id, slug, title, content, meta_title, meta_description, status, display_order) VALUES
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'home', 'Welcome to dMATHub', 'Master the Deutsche Master Admission Test with deterministic figure sequence drills, timed sectional simulations, and detailed analytical breakdown.', 'dMATHub — German Master Admission Test Preparation Platform', 'Official preparation hub for the dMAT examination.', 'PUBLISHED', 1),
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'about', 'About the dMAT Examination', 'The dMAT (Deutsche Master Admission Test) is a rigorous academic aptitude test used by leading European and German universities to evaluate graduate program candidates in technical, quantitative, and management disciplines.', 'About dMAT — Deutsche Master Admission Test', 'Format, eligibility, and academic objectives of the dMAT examination.', 'PUBLISHED', 2),
('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'exam', 'Examination Structure & Scoring', 'The examination comprises 4 core sections evaluated over 90 minutes. Section 1 covers Figure Sequences (4x4 grids), Section 2 covers Mathematical Equations, Section 3 tests Latin Squares, and Section 4 tests General Academic Logic.', 'dMAT Exam Structure, Timing & Scoring Guidelines', 'Comprehensive overview of timing, questions, and section limits.', 'PUBLISHED', 3),
('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'syllabus', 'Official Curriculum & Sections', 'Figure Sequences: Vector translation, cyclic rotation, topological reflection, matrix collision rules. Mathematical Equations: System constraints, operator precedence, parity preservation. Latin Squares: Distinct row/column Latin arrangements.', 'dMAT Detailed Syllabus & Topic Breakdown', 'Official section-wise curriculum for admission candidates.', 'PUBLISHED', 4),
('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'preparation', 'Strategic Preparation Framework', 'Begin with diagnostic evaluation in Figure Sequences. Focus on identifying rule invariants: track position first, then orientation, then fill state. Practice under strict per-question time limits (average 75 seconds).', 'Preparation Guide — How to Score in the 99th Percentile on dMAT', 'Targeted study roadmap and practice strategies for dMAT candidates.', 'PUBLISHED', 5),
('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'pricing', 'Access Tiers & Subscriptions', 'Choose the plan that matches your timeline. Start free as a Guest with 10 fixed questions, unlock 20 questions upon registering, or upgrade to Premium for infinite deterministic generated figure sequences.', 'Pricing & Membership Plans — dMATHub', 'Transparent pricing for dMAT candidates and test-takers.', 'PUBLISHED', 6),
('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'faq', 'Frequently Asked Questions', 'What is dMAT? Is calculator allowed? What is the passing cutoff? How many times can I attempt? Answers to all candidate queries.', 'dMAT FAQ — Answers to Common Questions', 'Frequently asked questions regarding dMAT admission test.', 'PUBLISHED', 7)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 11. NAVIGATION ITEMS
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

-- 12. SUBSCRIPTION PLANS
INSERT INTO plans (id, tenant_id, name, description, price, currency, billing_interval, features, status) VALUES
('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Free Guest', 'Evaluate core format with fixed 10 questions without registration.', 0.00, 'EUR', 'ONE_TIME', '["10 fixed questions", "Single diagnostic session", "Standard solutions", "No registration required"]'::jsonb, 'ACTIVE'),
('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Registered Member', 'Full access to 20-question fixed verified question bank with historical tracking.', 0.00, 'EUR', 'ONE_TIME', '["20 verified fixed questions", "Performance analytics", "Detailed step-by-step solutions", "Attempt history persistence"]'::jsonb, 'ACTIVE'),
('e1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Pro Unlimited Generator', 'Unlimited procedurally generated figure sequence drills with custom difficulty and length.', 29.00, 'EUR', 'MONTHLY', '["Unlimited generated questions", "Configurable difficulty (Easy/Med/Hard)", "Custom session lengths (5 to 30 items)", "Full 90-minute timed mock tests", "Weak-topic recommendation engine"]'::jsonb, 'ACTIVE')
ON CONFLICT DO NOTHING;
