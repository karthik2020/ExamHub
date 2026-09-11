import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService, CheckAnswerResponse } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { AttemptAnswer, Difficulty, PracticeTest, Question } from '../../types';

export const PracticeSession: React.FC = () => {
  const { currentTenant, studentPortalPath } = useTenant();
  const { user, tier } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Test Selection & Setup State
  const testIdParam = searchParams.get('test_id') || 'pt-diagnostic';
  const [availableTests, setAvailableTests] = useState<PracticeTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState(testIdParam);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'ALL'>('ALL');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Active Test Session State
  const [inSession, setInSession] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({}); // qId -> selected option
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, AttemptAnswer>>({}); // qId -> graded result
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load available tests
  useEffect(() => {
    examService
      .getPracticeTests(currentTenant?.id)
      .then((tests) => {
        setAvailableTests(tests);
        if (testIdParam && tests.some((t) => t.id === testIdParam)) {
          setSelectedTestId(testIdParam);
        } else if (tests[0]) {
          setSelectedTestId(tests[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [currentTenant?.id, testIdParam]);

  // Restore existing in-progress attempt if stored in sessionStorage
  useEffect(() => {
    const savedAttemptId = sessionStorage.getItem('examhub_active_attempt');
    if (savedAttemptId) {
      attemptService
        .getAttempt(savedAttemptId)
        .then((attempt) => {
          if (attempt && attempt.status === 'IN_PROGRESS' && attempt.questions?.length) {
            setAttemptId(attempt.id);
            setQuestions(attempt.questions);
            setInSession(true);

            // Restore user answers
            const answersMap: Record<string, string> = {};
            const gradedMap: Record<string, AttemptAnswer> = {};
            Object.values(attempt.answers || {}).forEach((ans) => {
              if (ans.selected_answer) answersMap[ans.question_id] = ans.selected_answer;
              if (ans.is_correct !== undefined) gradedMap[ans.question_id] = ans;
            });
            setUserSelections(answersMap);
            setCheckedAnswers(gradedMap);

            // Restore remaining timer
            const elapsed = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
            const remaining = Math.max(0, attempt.time_limit_seconds - elapsed);
            setSecondsRemaining(remaining);
          }
        })
        .catch(() => {
          sessionStorage.removeItem('examhub_active_attempt');
        });
    }
  }, []);

  // Countdown timer logic with automatic submission
  useEffect(() => {
    if (!inSession || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inSession, secondsRemaining]);

  // Launch Test Session via Authoritative Server Endpoint
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const resp = await attemptService.startTest({
        practice_test_id: selectedTestId,
        user_id: user.id,
        tenant_id: currentTenant?.id || 'a0000000-0000-0000-0000-000000000001',
        difficulty: selectedDifficulty,
        question_count: questionCount,
      });

      setAttemptId(resp.attempt_id);
      setQuestions(resp.questions);
      setSecondsRemaining(resp.time_limit_seconds);
      setCurrentIndex(0);
      setUserSelections({});
      setCheckedAnswers({});
      setInSession(true);

      sessionStorage.setItem('examhub_active_attempt', resp.attempt_id);
    } catch (err: any) {
      alert(`Error starting test: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // UX Requirement 33: [ Check Answer ] authoritatively graded on server before moving forward
  const handleCheckCurrentAnswer = async () => {
    if (!attemptId || !currentQuestion) return;
    const selectedOption = userSelections[currentQuestion.id];
    if (!selectedOption) return;

    setSubmitting(true);
    try {
      const resp: CheckAnswerResponse = await attemptService.checkAnswer({
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_option_key: selectedOption,
        time_spent_seconds: 10,
      });

      const graded: AttemptAnswer = {
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_answer: selectedOption,
        is_correct: resp.is_correct,
        correct_answer: resp.correct_answer,
        explanation: resp.explanation,
        solution: resp.solution,
        time_spent_seconds: 10,
        marks_awarded: resp.is_correct ? 1 : 0,
      };

      setCheckedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: graded,
      }));
    } catch (err: any) {
      console.error('Check answer error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Finish and submit attempt
  const handleFinishTest = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      const finalAttempt = await attemptService.submitAttempt(attemptId);
      sessionStorage.removeItem('examhub_active_attempt');
      navigate(`${studentPortalPath}/results/${finalAttempt.id}`);
    } catch (err: any) {
      alert(`Failed to submit attempt: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. SETUP / PRE-FLIGHT VIEW (Selecting drill, difficulty, and showing entitlement)
  if (!inSession) {
    const currentTestObj = availableTests.find((t) => t.id === selectedTestId);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Practice Drills • Interactive Mode
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Start Practice Session
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Practice mode allows checking each answer step-by-step with verified mathematical explanations.
            </p>
          </div>

          {/* Test Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Drill or Module:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTests.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTestId(t.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedTestId === t.id
                      ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                  <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-3">
                    <span>{t.question_count} Questions</span>
                    <span>•</span>
                    <span>{t.time_limit_minutes} Mins</span>
                    <span>•</span>
                    <span className="capitalize">{t.question_selection_mode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Available Questions by Difficulty:
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {diff === 'ALL' ? 'All Difficulties' : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Entitlement Notice based on Access Tier (dMATHub rules) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Current Entitlement: {tier}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {tier === 'GUEST' &&
                'As a Guest, you have access to the verified 10-question fixed pool. Filter options above filter this fixed set deterministically.'}
              {tier === 'REGISTERED' &&
                'As a Registered Member, you have unlocked the 20-question verified pool with persistent attempt tracking and performance history.'}
              {tier === 'PAID' &&
                'Pro tier unlocked: Infinite deterministic 4x4 matrix questions generated and validated on-the-fly.'}
            </p>
          </div>

          {/* Action Launch Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              id="btn-start-practice-session"
              disabled={loading}
              onClick={handleStartSession}
              className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <span>Begin Practice Drill</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE TEST RUNNER VIEW
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? userSelections[currentQuestion.id] : undefined;
  const currentResult = currentQuestion ? checkedAnswers[currentQuestion.id] : undefined;
  const isChecked = Boolean(currentResult);
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Test Navigation & Countdown Timer Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to pause or exit this practice drill?')) {
                setInSession(false);
              }
            }}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div className="text-[11px] text-slate-500">
              Checked: {Object.keys(checkedAnswers).length} / {questions.length}
            </div>
          </div>
        </div>

        {/* Question Palette Dots */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xs py-1">
          {questions.map((q, idx) => {
            const res = checkedAnswers[q.id];
            let dotClass = 'bg-slate-100 text-slate-600 border-slate-300';
            if (res) {
              dotClass = res.is_correct ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white';
            } else if (idx === currentIndex) {
              dotClass = 'bg-teal-700 text-white ring-2 ring-teal-500/30';
            } else if (userSelections[q.id]) {
              dotClass = 'bg-sky-100 text-sky-800 border-sky-400';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center border transition-colors ${dotClass}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Timer & Finish */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            type="button"
            id="btn-finish-practice-test"
            onClick={handleFinishTest}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Finish & Review
          </button>
        </div>
      </div>

      {/* Active Question Render */}
      {currentQuestion && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <QuestionRenderer
            question={currentQuestion}
            selectedAnswer={currentAnswer}
            onSelectAnswer={(val) => {
              if (!isChecked) {
                setUserSelections((prev) => ({
                  ...prev,
                  [currentQuestion.id]: val,
                }));
              }
            }}
            result={currentResult}
            disabled={isChecked}
          />

          {/* Action Row adhering strictly to Section 33 Question UX:
              [ Check Answer ] -> Correct/Incorrect + Solution -> [ Next Question ]
          */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-2">
              {!isChecked ? (
                <button
                  type="button"
                  id="btn-check-answer"
                  disabled={!currentAnswer || submitting}
                  onClick={handleCheckCurrentAnswer}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check Answer</span>
                </button>
              ) : isLastQuestion ? (
                <button
                  type="button"
                  id="btn-submit-final"
                  onClick={handleFinishTest}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Submit & View Results</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-next-question"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
