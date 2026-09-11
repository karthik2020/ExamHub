import {
  Attempt,
  AttemptAnswer,
  AuditLog,
  CMSPage,
  Exam,
  ExamSection,
  NavigationItem,
  Plan,
  PracticeTest,
  Question,
  Tenant,
  Topic,
  User,
} from '../src/types';
import { getSeedQuestions } from '../src/data/seedQuestions';

export class StorageEngine {
  public tenants: Map<string, Tenant> = new Map();
  public users: Map<string, User> = new Map();
  public exams: Map<string, Exam> = new Map();
  public sections: Map<string, ExamSection> = new Map();
  public topics: Map<string, Topic> = new Map();
  public questions: Map<string, Question> = new Map();
  public practiceTests: Map<string, PracticeTest> = new Map();
  public attempts: Map<string, Attempt> = new Map();
  public pages: Map<string, CMSPage> = new Map();
  public navigation: NavigationItem[] = [];
  public plans: Map<string, Plan> = new Map();
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // 1. Tenant 1: dMATHub
    const dmatTenant: Tenant = {
      id: 'a0000000-0000-0000-0000-000000000001',
      slug: 'dmathub',
      name: 'dMATHub',
      domain: 'dmathub.com',
      status: 'ACTIVE',
      logo_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=128&auto=format&fit=crop&q=80',
      favicon_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=32&auto=format&fit=crop&q=80',
      primary_color: '#0f766e',
      secondary_color: '#0284c7',
      font_family: 'Plus Jakarta Sans, sans-serif',
      student_path: '/ems',
    };
    this.tenants.set(dmatTenant.id, dmatTenant);

    // Tenant 2: NISM Prep (Multi-tenancy verification)
    const nismTenant: Tenant = {
      id: 'a0000000-0000-0000-0000-000000000002',
      slug: 'nismprep',
      name: 'NISM Certification Portal',
      domain: 'nismprep.com',
      status: 'ACTIVE',
      logo_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=80',
      favicon_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=32&auto=format&fit=crop&q=80',
      primary_color: '#1e3a8a',
      secondary_color: '#b45309',
      font_family: 'Inter, sans-serif',
      student_path: '/portal',
    };
    this.tenants.set(nismTenant.id, nismTenant);

    // 2. Users
    const adminUser: User = {
      id: 'u0000000-0000-0000-0000-000000000001',
      email: 'admin@dmathub.com',
      name: 'System Administrator',
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      tier: 'PAID',
    };
    const studentUser: User = {
      id: 'u0000000-0000-0000-0000-000000000002',
      email: 'student@dmathub.com',
      name: 'Alexander Weber',
      status: 'ACTIVE',
      role: 'STUDENT',
      tier: 'REGISTERED',
    };
    const guestUser: User = {
      id: 'u0000000-0000-0000-0000-000000000003',
      email: 'guest@dmathub.com',
      name: 'Guest Candidate',
      status: 'ACTIVE',
      role: 'STUDENT',
      tier: 'GUEST',
    };
    this.users.set(adminUser.id, adminUser);
    this.users.set(studentUser.id, studentUser);
    this.users.set(guestUser.id, guestUser);

    // 3. Exams
    const dmatExam: Exam = {
      id: 'e0000000-0000-0000-0000-000000000001',
      tenant_id: dmatTenant.id,
      name: 'dMAT — Deutsche Master Admission Test',
      slug: 'dmat',
      description: 'Standardized entrance examination for master programs at German universities assessing analytical, non-verbal abstract reasoning and quantitative capacity.',
      status: 'ACTIVE',
      exam_type: 'ADMISSION',
      duration_minutes: 90,
      passing_score: 65,
      instructions: 'Each question carries equal marks. No negative marking in practice mode.',
    };
    this.exams.set(dmatExam.id, dmatExam);

    // 4. Sections
    const secFigures: ExamSection = {
      id: 's0000000-0000-0000-0000-000000000001',
      exam_id: dmatExam.id,
      name: 'Figure Sequences',
      slug: 'figure-sequences',
      description: 'Identify logical 4x4 matrix visual progression across 6 sequential states.',
      display_order: 1,
      time_limit_minutes: 25,
      question_count: 20,
      status: 'ACTIVE',
    };
    const secEquations: ExamSection = {
      id: 's0000000-0000-0000-0000-000000000002',
      exam_id: dmatExam.id,
      name: 'Mathematical Equations',
      slug: 'mathematical-equations',
      description: 'Complex algebra, modular arithmetic and operator substitution.',
      display_order: 2,
      time_limit_minutes: 25,
      question_count: 20,
      status: 'ACTIVE',
    };
    const secLatin: ExamSection = {
      id: 's0000000-0000-0000-0000-000000000003',
      exam_id: dmatExam.id,
      name: 'Latin Squares',
      slug: 'latin-squares',
      description: 'Orthogonal combinatorial matrix deductions.',
      display_order: 3,
      time_limit_minutes: 20,
      question_count: 15,
      status: 'ACTIVE',
    };
    const secAcademic: ExamSection = {
      id: 's0000000-0000-0000-0000-000000000004',
      exam_id: dmatExam.id,
      name: 'General Academic Module',
      slug: 'general-academic-module',
      description: 'Scientific abstract analysis and logical syllogisms.',
      display_order: 4,
      time_limit_minutes: 20,
      question_count: 15,
      status: 'ACTIVE',
    };
    this.sections.set(secFigures.id, secFigures);
    this.sections.set(secEquations.id, secEquations);
    this.sections.set(secLatin.id, secLatin);
    this.sections.set(secAcademic.id, secAcademic);

    // 5. Topics
    const topics: Topic[] = [
      { id: 't0000000-0000-0000-0000-000000000001', section_id: secFigures.id, name: 'Single Element Motion & Bounce', slug: 'single-motion-bounce', display_order: 1 },
      { id: 't0000000-0000-0000-0000-000000000002', section_id: secFigures.id, name: 'Rotational Symmetry & Inversion', slug: 'rotational-symmetry', display_order: 2 },
      { id: 't0000000-0000-0000-0000-000000000003', section_id: secFigures.id, name: 'Multi-Symbol Interacting Sequences', slug: 'multi-symbol-interaction', display_order: 3 },
      { id: 't0000000-0000-0000-0000-000000000004', section_id: secEquations.id, name: 'Modular Equations & Operators', slug: 'modular-equations', display_order: 1 },
    ];
    topics.forEach((t) => this.topics.set(t.id, t));

    // 6. Questions (Fixed 20 pool)
    const seedQs = getSeedQuestions();
    seedQs.forEach((q) => this.questions.set(q.id, q));

    // 7. Practice Tests
    const tests: PracticeTest[] = [
      {
        id: 'pt-diagnostic',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: secFigures.id,
        name: 'dMAT Diagnostic Evaluation',
        description: 'Benchmark your starting abstract logic competency with 10 fixed questions across varying difficulty levels.',
        test_type: 'DIAGNOSTIC',
        difficulty: 'ALL',
        question_selection_mode: 'FIXED',
        question_count: 10,
        time_limit_minutes: 15,
        is_published: true,
      },
      {
        id: 'pt-easy-drill',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: secFigures.id,
        name: 'Figure Sequences: Foundational Drills (Easy)',
        description: 'Single-variable movement and cyclic boundary wrapping in 4x4 grids with instant step verification.',
        test_type: 'PRACTICE',
        difficulty: 'EASY',
        question_selection_mode: 'FIXED',
        question_count: 5,
        time_limit_minutes: 8,
        is_published: true,
      },
      {
        id: 'pt-medium-drill',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: secFigures.id,
        name: 'Figure Sequences: Intermediate Transformation (Medium)',
        description: 'Multi-property changes including simultaneous rotation, boundary reflection, and fill toggle.',
        test_type: 'PRACTICE',
        difficulty: 'MEDIUM',
        question_selection_mode: 'FIXED',
        question_count: 5,
        time_limit_minutes: 10,
        is_published: true,
      },
      {
        id: 'pt-hard-drill',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: secFigures.id,
        name: 'Figure Sequences: Advanced System Reasoning (Hard)',
        description: 'Multi-symbol systems with composite boundary reflection and counter-directional trajectories.',
        test_type: 'PRACTICE',
        difficulty: 'HARD',
        question_selection_mode: 'FIXED',
        question_count: 5,
        time_limit_minutes: 12,
        is_published: true,
      },
      {
        id: 'pt-generator-unlimited',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        section_id: secFigures.id,
        name: 'Procedural Figure Sequence Generator (Pro)',
        description: 'Infinite dynamically validated 4x4 matrix questions generated via seedable deterministic rules.',
        test_type: 'PRACTICE',
        difficulty: 'MEDIUM',
        question_selection_mode: 'GENERATED',
        question_count: 10,
        time_limit_minutes: 15,
        is_published: true,
      },
      {
        id: 'pt-full-mock',
        tenant_id: dmatTenant.id,
        exam_id: dmatExam.id,
        name: 'dMAT Full Official Simulation Mock Exam',
        description: 'Complete timed simulation mimicking official exam conditions with countdown timer and post-exam score breakdown.',
        test_type: 'MOCK',
        difficulty: 'ALL',
        question_selection_mode: 'FIXED',
        question_count: 10,
        time_limit_minutes: 20,
        is_published: true,
      },
    ];
    tests.forEach((t) => this.practiceTests.set(t.id, t));

    // 8. CMS Pages
    const pages: CMSPage[] = [
      {
        id: 'page-home',
        tenant_id: dmatTenant.id,
        slug: 'home',
        title: 'Master the Deutsche Master Admission Test',
        content: `dMATHub is the definitive preparation platform for international candidates seeking admission to premier German universities. Featuring our verified 4x4 matrix figure sequence engine, sectional mock simulations, and rigorous performance diagnostics.`,
        meta_title: 'dMATHub — Deutsche Master Admission Test Preparation Platform',
        meta_description: 'Prepare for the dMAT entrance examination with official practice tests, deterministic figure sequence drills, and comprehensive syllabus coverage.',
        status: 'PUBLISHED',
        display_order: 1,
      },
      {
        id: 'page-about',
        tenant_id: dmatTenant.id,
        slug: 'about',
        title: 'About the dMAT Examination',
        content: `The Deutsche Master Admission Test (dMAT) is a standardized assessment required by elite faculties across Germany for graduate degrees in engineering, economics, data science, and management. It measures non-verbal abstract logic, analytical math equations, combinatorial Latin square arrangements, and academic critical reading.`,
        meta_title: 'About dMAT — Overview & Eligibility',
        meta_description: 'Learn about test formats, scoring criteria, and university acceptance requirements for dMAT.',
        status: 'PUBLISHED',
        display_order: 2,
      },
      {
        id: 'page-exam',
        tenant_id: dmatTenant.id,
        slug: 'exam',
        title: 'Exam Structure & Timing Rules',
        content: `The dMAT consists of 4 strictly timed modules totaling 90 minutes. 
Section 1: Figure Sequences (25 minutes, 20 items)
Section 2: Mathematical Equations (25 minutes, 20 items)
Section 3: Latin Squares (20 minutes, 15 items)
Section 4: General Academic Reasoning (20 minutes, 15 items).
Each question has equal weight. There is no negative deduction for incorrect answers.`,
        meta_title: 'dMAT Exam Structure & Section Timings',
        meta_description: 'Breakdown of exam modules, questions count, and scoring formulas.',
        status: 'PUBLISHED',
        display_order: 3,
      },
      {
        id: 'page-syllabus',
        tenant_id: dmatTenant.id,
        slug: 'syllabus',
        title: 'Detailed Official Curriculum',
        content: `The official curriculum focuses on rule induction without verbal bias:
1. Spatial Sequences: 4x4 matrix vector translation, cyclic wrapping, border bounce, quadrant reflection, angular rotation.
2. Equations: Modular systems, operator definition, algebraic factoring.
3. Latin Squares: Sudoku-like unique symbol distribution across orthographic dimensions.
4. Academic Module: Hypothesis evaluation and premise validation.`,
        meta_title: 'dMAT Detailed Syllabus & Section Requirements',
        meta_description: 'Full curriculum topics and mathematical competencies tested.',
        status: 'PUBLISHED',
        display_order: 4,
      },
      {
        id: 'page-preparation',
        tenant_id: dmatTenant.id,
        slug: 'preparation',
        title: 'Recommended Preparation Strategy',
        content: `1. Diagnostic Phase: Complete the baseline 10-question test to detect pattern recognition speed.
2. Invariant Tracking: In Figure Sequences, decompose the matrix by tracking one symbol property at a time (e.g. position first, then orientation, then fill).
3. Pacing: You have approximately 75 seconds per question. Never spend over 2 minutes on a single puzzle.`,
        meta_title: 'dMAT Preparation Roadmap & Tips',
        meta_description: 'Proven strategies to reach the 95th percentile on the dMAT exam.',
        status: 'PUBLISHED',
        display_order: 5,
      },
      {
        id: 'page-pricing',
        tenant_id: dmatTenant.id,
        slug: 'pricing',
        title: 'Membership & Subscription Tiers',
        content: `Start practicing immediately without payment:
• Guest: 10 fixed questions (no account required).
• Registered Member: Free sign-up unlocks all 20 verified questions, attempt history, and progress analytics.
• Pro Unlimited: €29/month unlocks the procedural Figure Sequence Generator for limitless practice tests.`,
        meta_title: 'Pricing & Membership Plans — dMATHub',
        meta_description: 'Explore Guest, Registered, and Pro options for dMAT preparation.',
        status: 'PUBLISHED',
        display_order: 6,
      },
      {
        id: 'page-faq',
        tenant_id: dmatTenant.id,
        slug: 'faq',
        title: 'Frequently Asked Questions',
        content: `Q: Are calculators permitted in dMAT?
A: No external calculators are permitted. All arithmetic is designed for mental calculation.

Q: How are figure sequence grids formatted?
A: Each question presents 4 given sequential 4x4 grids. Grids 5 and 6 are missing. Candidates choose the pair among 4 options.

Q: Can I retake the test?
A: Candidates may retake practice tests without restriction.`,
        meta_title: 'dMAT FAQ — Candidate Answers',
        meta_description: 'Answers to common questions regarding registration, test day, and scoring.',
        status: 'PUBLISHED',
        display_order: 7,
      },
    ];
    pages.forEach((p) => this.pages.set(p.slug, p));

    // 9. Navigation Items
    this.navigation = [
      { id: 'nav-1', tenant_id: dmatTenant.id, location: 'HEADER', label: 'Home', url: '/', display_order: 1, is_visible: true },
      { id: 'nav-2', tenant_id: dmatTenant.id, location: 'HEADER', label: 'About dMAT', url: '/about', display_order: 2, is_visible: true },
      { id: 'nav-3', tenant_id: dmatTenant.id, location: 'HEADER', label: 'Exam', url: '/exam', display_order: 3, is_visible: true },
      { id: 'nav-4', tenant_id: dmatTenant.id, location: 'HEADER', label: 'Syllabus', url: '/syllabus', display_order: 4, is_visible: true },
      { id: 'nav-5', tenant_id: dmatTenant.id, location: 'HEADER', label: 'Preparation', url: '/preparation', display_order: 5, is_visible: true },
      { id: 'nav-6', tenant_id: dmatTenant.id, location: 'HEADER', label: 'Pricing', url: '/pricing', display_order: 6, is_visible: true },
      { id: 'nav-7', tenant_id: dmatTenant.id, location: 'HEADER', label: 'FAQ', url: '/faq', display_order: 7, is_visible: true },
      { id: 'nav-sb-1', tenant_id: dmatTenant.id, location: 'STUDENT_SIDEBAR', label: 'Dashboard', url: '/ems', display_order: 1, is_visible: true },
      { id: 'nav-sb-2', tenant_id: dmatTenant.id, location: 'STUDENT_SIDEBAR', label: 'Practice Drills', url: '/ems/practice', display_order: 2, is_visible: true },
      { id: 'nav-sb-3', tenant_id: dmatTenant.id, location: 'STUDENT_SIDEBAR', label: 'Mock Exams', url: '/ems/mock-tests', display_order: 3, is_visible: true },
      { id: 'nav-sb-4', tenant_id: dmatTenant.id, location: 'STUDENT_SIDEBAR', label: 'Analytics', url: '/ems/progress', display_order: 4, is_visible: true },
      { id: 'nav-sb-5', tenant_id: dmatTenant.id, location: 'STUDENT_SIDEBAR', label: 'Study Plan', url: '/ems/study-plan', display_order: 5, is_visible: true },
    ];

    // 10. Plans
    const plans: Plan[] = [
      {
        id: 'plan-free',
        tenant_id: dmatTenant.id,
        name: 'Guest Pass',
        description: 'Explore core format with 10 fixed questions without creating an account.',
        price: 0,
        currency: 'EUR',
        billing_interval: 'ONE_TIME',
        features: ['10 fixed questions', 'Basic answer verification', 'Immediate solution preview', 'No registration required'],
        status: 'ACTIVE',
      },
      {
        id: 'plan-registered',
        tenant_id: dmatTenant.id,
        name: 'Registered Candidate',
        description: 'Unlock 20 fixed questions with full historical performance and topic analytics.',
        price: 0,
        currency: 'EUR',
        billing_interval: 'ONE_TIME',
        features: ['20 verified questions', 'Personal attempt persistence', 'Section accuracy reports', 'Step-by-step mathematical reasoning'],
        status: 'ACTIVE',
      },
      {
        id: 'plan-pro',
        tenant_id: dmatTenant.id,
        name: 'Pro Unlimited',
        description: 'Unlimited procedurally generated 4x4 matrix questions and timed mocks.',
        price: 29,
        currency: 'EUR',
        billing_interval: 'MONTHLY',
        features: ['Unlimited generated questions', 'Difficulty selection (Easy/Med/Hard)', 'Custom session sizing (5-30 items)', '90-min full simulated mocks', 'Priority admission support'],
        status: 'ACTIVE',
      },
    ];
    plans.forEach((p) => this.plans.set(p.id, p));

    // Audit Log seed
    this.auditLogs.push({
      id: 'audit-init',
      tenant_id: dmatTenant.id,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'PLATFORM',
      entity_id: 'examhub-engine',
      old_data: null,
      new_data: { version: '1.0.0', tenant: 'dmathub' },
      created_at: new Date().toISOString(),
    });
  }

  // Authoritative Scoring & Verification
  public gradeAnswer(
    question: Question,
    selectedOptionKey: string
  ): { isCorrect: boolean; explanation?: string; solution?: string; correctAnswer: string } {
    const isCorrect = question.correct_answer === selectedOptionKey;
    return {
      isCorrect,
      explanation: question.explanation,
      solution: question.solution,
      correctAnswer: question.correct_answer || '',
    };
  }
}

export const storage = new StorageEngine();
