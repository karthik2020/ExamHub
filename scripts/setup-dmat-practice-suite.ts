import { getSupabaseAdminClient } from '../server/supabase';

async function setupPracticeSuite() {
  const db = getSupabaseAdminClient();
  if (!db) {
    console.error('Database client not available');
    process.exit(1);
  }

  const tenantId = 'a0000000-0000-0000-0000-000000000001';
  const examId = 'e0000000-0000-0000-0000-000000000001';
  const secFigure = 'b0000000-0000-0000-0000-000000000001';
  const secMath = 'b0000000-0000-0000-0000-000000000002';
  const secLatin = 'b0000000-0000-0000-0000-000000000003';
  const secAcademic = 'b0000000-0000-0000-0000-000000000004';

  console.log('1. Depublishing old test run artifacts...');
  const { error: depubErr } = await db
    .from('practice_tests')
    .update({ is_published: false })
    .neq('id', 'e2000000-0000-0000-0000-000000000001')
    .ilike('name', '%Phase%');
  if (depubErr) console.error('Depublish error:', depubErr);

  console.log('2. Upserting official dMAT tests...');
  const officialTests = [
    {
      id: 'e2000000-0000-0000-0000-000000000001',
      tenant_id: tenantId,
      exam_id: examId,
      section_id: secFigure,
      name: 'dMAT Diagnostic Figure Sequence Assessment',
      description: 'Official diagnostic assessment establishing baseline proficiency in 4x4 matrix transformation sequences.',
      test_type: 'PRACTICE',
      difficulty: 'MEDIUM',
      question_selection_mode: 'FIXED',
      question_count: 10,
      time_limit_minutes: 15,
      is_published: true,
    },
    {
      id: 'e2000000-0000-0000-0000-000000000002',
      tenant_id: tenantId,
      exam_id: examId,
      section_id: secFigure,
      name: 'Figure Sequences — High-Yield Practice Drill',
      description: 'Curated 20-question practice drill spanning translation, rotational symmetry, and multi-symbol interactions.',
      test_type: 'PRACTICE',
      difficulty: 'MEDIUM',
      question_selection_mode: 'FIXED',
      question_count: 20,
      time_limit_minutes: 25,
      is_published: true,
    },
    {
      id: 'e2000000-0000-0000-0000-000000000003',
      tenant_id: tenantId,
      exam_id: examId,
      section_id: secFigure,
      name: 'Figure Sequences — Unlimited Procedural Drill',
      description: 'Live algorithmic question generation delivering limitless 4x4 matrix transformation sequences.',
      test_type: 'PRACTICE',
      difficulty: 'MEDIUM',
      question_selection_mode: 'GENERATED',
      question_count: 10,
      time_limit_minutes: 15,
      is_published: true,
    },
    {
      id: 'e2000000-0000-0000-0000-000000000004',
      tenant_id: tenantId,
      exam_id: examId,
      section_id: secMath,
      name: 'Mathematical Equations & Logic Drill',
      description: 'Focused drill on modular arithmetic, operator deductions, and simultaneous equations.',
      test_type: 'PRACTICE',
      difficulty: 'MEDIUM',
      question_selection_mode: 'FIXED',
      question_count: 3,
      time_limit_minutes: 10,
      is_published: true,
    },
    {
      id: 'e2000000-0000-0000-0000-000000000005',
      tenant_id: tenantId,
      exam_id: examId,
      section_id: null,
      name: 'dMAT Full-Length Simulation Mock Exam',
      description: 'Standardized 25-question timed simulation across Figure Sequences, Mathematical Equations, Latin Squares, and Academic Reasoning under strict 45-minute exam conditions.',
      test_type: 'MOCK',
      difficulty: 'MEDIUM',
      question_selection_mode: 'FIXED',
      question_count: 25,
      time_limit_minutes: 45,
      is_published: true,
    },
  ];

  for (const t of officialTests) {
    const { error: upsertErr } = await db.from('practice_tests').upsert(t);
    if (upsertErr) console.error(`Error upserting ${t.name}:`, upsertErr);
  }

  console.log('3. Mapping questions for High-Yield Practice Drill (20 questions)...');
  const { data: fsQuestions } = await db
    .from('questions')
    .select('id')
    .eq('section_id', secFigure)
    .order('created_at', { ascending: true })
    .limit(20);

  if (fsQuestions && fsQuestions.length >= 20) {
    const drillMappings = fsQuestions.map((q, idx) => ({
      practice_test_id: 'e2000000-0000-0000-0000-000000000002',
      question_id: q.id,
      display_order: idx + 1,
      marks: 1,
    }));
    await db.from('practice_test_questions').delete().eq('practice_test_id', 'e2000000-0000-0000-0000-000000000002');
    const { error: mapErr2 } = await db.from('practice_test_questions').insert(drillMappings);
    if (mapErr2) console.error('Map drill error:', mapErr2);
  }

  console.log('4. Mapping questions for Mathematical Equations Drill (3 questions)...');
  const { data: mathQuestions } = await db
    .from('questions')
    .select('id')
    .eq('section_id', secMath)
    .limit(3);

  if (mathQuestions) {
    const mathMappings = mathQuestions.map((q, idx) => ({
      practice_test_id: 'e2000000-0000-0000-0000-000000000004',
      question_id: q.id,
      display_order: idx + 1,
      marks: 1,
    }));
    await db.from('practice_test_questions').delete().eq('practice_test_id', 'e2000000-0000-0000-0000-000000000004');
    const { error: mapMathErr } = await db.from('practice_test_questions').insert(mathMappings);
    if (mapMathErr) console.error('Map math error:', mapMathErr);
  }

  console.log('5. Mapping questions for Full Mock Exam (25 questions across 4 sections)...');
  // 18 from Figure Sequences, 3 from Math, 2 from Latin Squares, 2 from General Academic
  const { data: mockFs } = await db.from('questions').select('id').eq('section_id', secFigure).limit(18);
  const { data: mockMath } = await db.from('questions').select('id').eq('section_id', secMath).limit(3);
  const { data: mockLatin } = await db.from('questions').select('id').eq('section_id', secLatin).limit(2);
  const { data: mockAcademic } = await db.from('questions').select('id').eq('section_id', secAcademic).limit(2);

  const combinedMockQuestions = [
    ...(mockFs || []),
    ...(mockMath || []),
    ...(mockLatin || []),
    ...(mockAcademic || []),
  ];

  const mockMappings = combinedMockQuestions.map((q, idx) => ({
    practice_test_id: 'e2000000-0000-0000-0000-000000000005',
    question_id: q.id,
    display_order: idx + 1,
    marks: 1,
  }));

  await db.from('practice_test_questions').delete().eq('practice_test_id', 'e2000000-0000-0000-0000-000000000005');
  const { error: mockMapErr } = await db.from('practice_test_questions').insert(mockMappings);
  if (mockMapErr) console.error('Map mock error:', mockMapErr);

  console.log('Practice suite configured successfully!');
}

setupPracticeSuite();
