import { apiFetch } from './apiClient';
import { Attempt, Difficulty, Question, TestType } from '../types';

export interface StartAttemptResponse {
  attempt_id: string;
  started_at: string;
  time_limit_seconds: number;
  test_type: TestType;
  test_name: string;
  questions: Question[];
  total_questions: number;
}

export interface CheckAnswerResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
  solution?: string;
  attempt_stats: {
    correct: number;
    incorrect: number;
    score: number;
  };
}

export const attemptService = {
  async startTest(params: {
    practice_test_id: string;
    user_id: string;
    tenant_id: string;
    difficulty?: Difficulty | 'ALL';
    question_count?: number;
  }): Promise<StartAttemptResponse> {
    return apiFetch<StartAttemptResponse>('/api/practice-tests/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getAttempt(attemptId: string): Promise<Attempt> {
    return apiFetch<Attempt>(`/api/attempts/${attemptId}`);
  },

  async checkAnswer(params: {
    attempt_id: string;
    question_id: string;
    selected_option_key: string;
    time_spent_seconds?: number;
  }): Promise<CheckAnswerResponse> {
    return apiFetch<CheckAnswerResponse>(`/api/attempts/${params.attempt_id}/check-answer`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async saveAnswer(params: {
    attempt_id: string;
    question_id: string;
    selected_option_key: string;
    time_spent_seconds?: number;
  }): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/attempts/${params.attempt_id}/save-answer`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async submitAttempt(attemptId: string): Promise<Attempt> {
    return apiFetch<Attempt>(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
    });
  },

  async getUserHistory(userId: string): Promise<Attempt[]> {
    return apiFetch<Attempt[]>(`/api/attempts/user/${userId}`);
  },
};
