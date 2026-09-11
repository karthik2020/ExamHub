export type Role = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'CONTENT_EDITOR' | 'QUESTION_EDITOR' | 'STUDENT';

export type UserTier = 'GUEST' | 'REGISTERED' | 'PAID';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  role: Role;
  tier: UserTier;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  student_path: string; // e.g. '/ems'
  created_at?: string;
  updated_at?: string;
}

export interface Exam {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  exam_type: 'ADMISSION' | 'CERTIFICATION' | 'APTITUDE';
  duration_minutes: number;
  passing_score: number;
  instructions?: string;
}

export interface ExamSection {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  time_limit_minutes?: number;
  question_count: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Topic {
  id: string;
  section_id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
}

export type QuestionType =
  | 'FIGURE_SEQUENCE'
  | 'SINGLE_MCQ'
  | 'MULTI_MCQ'
  | 'TRUE_FALSE'
  | 'NUMERICAL'
  | 'TEXT'
  | 'IMAGE'
  | 'PASSAGE';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export type QuestionSource = 'MANUAL' | 'IMPORTED' | 'GENERATED' | 'AI_GENERATED';

// 4x4 Figure Grid Data Types
export type SymbolShape = 'circle' | 'square' | 'triangle' | 'cross' | 'diamond' | 'star';
export type SymbolFill = 'filled' | 'outline' | 'striped';

export interface GridSymbol {
  id: string;
  row: number; // 0 to 3 for a 4x4 grid
  col: number; // 0 to 3
  shape: SymbolShape;
  fill: SymbolFill;
  rotation: number; // 0, 90, 180, 270 degrees
  color?: string;
}

export interface FigureGrid {
  dimension: 4;
  symbols: GridSymbol[];
}

export interface FigureSequenceQuestionData {
  dimension: 4;
  totalSteps: 6;
  givenSteps: 4;
  missingSteps: [5, 6];
  steps: FigureGrid[]; // 6 full states: 0..3 given, 4..5 are missing
  ruleType: 'movement' | 'rotation' | 'bounce' | 'color_flip' | 'count_change' | 'shape_toggle' | 'composite';
  ruleDescription: string;
  stepExplanations: string[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_key: 'A' | 'B' | 'C' | 'D';
  option_text?: string;
  option_data?: {
    grid5: FigureGrid;
    grid6: FigureGrid;
  } | any;
  display_order: number;
  is_correct?: boolean; // Stripped on client during active tests
}

export interface Question {
  id: string;
  tenant_id: string;
  exam_id: string;
  section_id: string;
  topic_id?: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  question_text: string;
  question_data: FigureSequenceQuestionData | any;
  correct_answer?: string; // Stripped in test session until checked/submitted
  explanation?: string;
  solution?: string;
  source_type: QuestionSource;
  generator_type?: string;
  status: QuestionStatus;
  estimated_time_seconds: number;
  options: QuestionOption[];
  is_fixed_pool?: boolean;
  pool_access?: 'GUEST' | 'REGISTERED' | 'PAID';
}

export type TestType = 'PRACTICE' | 'MOCK' | 'DIAGNOSTIC' | 'CUSTOM';
export type QuestionSelectionMode = 'FIXED' | 'RANDOM' | 'GENERATED' | 'ADAPTIVE';

export interface PracticeTest {
  id: string;
  tenant_id: string;
  exam_id: string;
  section_id?: string;
  name: string;
  description: string;
  test_type: TestType;
  difficulty: Difficulty | 'ALL';
  question_selection_mode: QuestionSelectionMode;
  question_count: number;
  time_limit_minutes: number;
  attempt_limit?: number;
  is_published: boolean;
  created_at?: string;
}

export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'ABANDONED';

export interface AttemptAnswer {
  id?: string;
  attempt_id: string;
  question_id: string;
  selected_answer?: string;
  is_correct?: boolean;
  started_at?: string;
  answered_at?: string;
  time_spent_seconds: number;
  marks_awarded: number;
  explanation?: string;
  solution?: string;
  correct_answer?: string;
}

export interface Attempt {
  id: string;
  tenant_id: string;
  user_id: string;
  practice_test_id: string;
  practice_test_name?: string;
  started_at: string;
  submitted_at?: string;
  time_limit_seconds: number;
  time_spent_seconds: number;
  status: AttemptStatus;
  score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  answers: Record<string, AttemptAnswer>; // question_id -> AttemptAnswer
  questions?: Question[];
}

export interface CMSPage {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  display_order: number;
}

export interface NavigationItem {
  id: string;
  tenant_id: string;
  location: 'HEADER' | 'FOOTER' | 'STUDENT_SIDEBAR';
  label: string;
  url: string;
  display_order: number;
  is_visible: boolean;
}

export interface Plan {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
  features: string[];
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export interface GenerationValidationResult {
  isValid: boolean;
  seed: string;
  version: string;
  generatorType: string;
  parameters: Record<string, any>;
  checks: ValidationCheck[];
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}
