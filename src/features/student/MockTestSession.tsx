import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  HelpCircle,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { PracticeTest, Question } from '../../types';

export const MockTestSession: React.FC = () => {
  const { currentTenant, studentPortalPath, activeExam } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const testIdParam = searchParams.get('test_id');
  const [mockTests, setMockTests] = useState<PracticeTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [inSession, setInSession] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    examService
      .getPracticeTests(currentTenant?.id, activeExam?.id)
      .then((list) => {
        if (!isMounted) return;
        const mocks = list.filter((t) => t.test_type === 'MOCK');
        const available = mocks.length > 0 ? mocks : list;
        setMockTests(available);

        if (testIdParam && available.some((t) => t.id === testIdParam)) {
          setSelectedTestId(testIdParam);
        } else if (available.length > 0) {
          setSelectedTestId(available[0].id);
        } else {
          setSelectedTestId('');
        }
      })
      .catch((err) => console.error('Failed to load mock tests:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTenant?.id, activeExam?.id, testIdParam]);

  useEffect(() => {
    if (!inSession || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitMock(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inSession, secondsRemaining]);

  const handleStartMock = async () => {
    if (!selectedTestId) return;
    setLoading(true);
    try {
      const resp = await attemptService.startTest({
        practice_test_id: selectedTestId,
        user_id: user.id,
        tenant_id: currentTenant?.id || '',
      });
      setAttemptId(resp.attempt_id);
      setQuestions(resp.questions);
      setSecondsRemaining(resp.time_limit_seconds);
      setCurrentIndex(0);
      setAnswers({});
      setInSession(true);
    } catch (err: any) {
      alert(`Error starting mock test: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (!attemptId || !currentQuestion) return;
    const selected = answers[currentQuestion.id];
    if (selected) {
      await attemptService.saveAnswer({
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_option_key: selected,
        time_spent_seconds: 15,
      });
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmitMock = async (auto = false) => {
    if (!attemptId) return;
    if (!auto && !confirm('Are you ready to submit your full mock examination?')) return;

    setSubmitting(true);
    try {
      // Save last question answer if selected
      if (currentQuestion && answers[currentQuestion.id]) {
        await attemptService.saveAnswer({
          attempt_id: attemptId,
          question_id: currentQuestion.id,
          selected_option_key: answers[currentQuestion.id],
          time_spent_seconds: 10,
        });
      }
      const finalAttempt = await attemptService.submitAttempt(attemptId);
      navigate(`${studentPortalPath}/results/${finalAttempt.id}`);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!inSession) {
    const activeTest = mockTests.find((t) => t.id === selectedTestId);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              Official Simulation • {activeExam?.name || currentTenant?.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeTest?.name || `${activeExam?.name || 'Full'} Official Mock Exam`}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Simulates authentic test-day environment with strict countdown timing, question navigation palette, and
              comprehensive post-exam scoring.
            </p>
          </div>

          {/* Test Selector if multiple available */}
          {mockTests.length > 1 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Select Mock Examination:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockTests.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTestId(t.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedTestId === t.id
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>{t.question_count} Questions</span>
                      <span>•</span>
                      <span>{t.time_limit_minutes} Mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mockTests.length === 0 && !loading ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                No mock exams currently scheduled for {activeExam?.name || 'this exam'}.
              </p>
              <p className="text-xs text-slate-500">
                You can still sharpen your skills using interactive practice drills.
              </p>
              <div className="pt-2">
                <Link
                  to={`${studentPortalPath}/practice`}
                  className="inline-block px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-800"
                >
                  Go to Practice Sessions
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Time Limit</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {activeTest?.time_limit_minutes || activeExam?.duration_minutes || 60} Minutes
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Questions</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {activeTest?.question_count || 20} Items
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Passing Mark</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {activeExam?.passing_score ? `${activeExam.passing_score}%` : 'Standard'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Examination Instructions:</span>
                  </div>
                  {activeExam?.instructions ? (
                    <p className="text-amber-800/90 text-[11px] leading-relaxed whitespace-pre-line">
                      {activeExam.instructions}
                    </p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-amber-800/90 text-[11px]">
                      <li>Answers are submitted once at the end of the examination.</li>
                      <li>Solutions and explanations will be revealed on the Results screen following submission.</li>
                      <li>When the countdown timer reaches 00:00, your test will be automatically scored and submitted.</li>
                      <li>If the page is refreshed, your timer and recorded choices will be restored.</li>
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  id="btn-launch-mock"
                  disabled={loading || !selectedTestId}
                  onClick={handleStartMock}
                  className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Begin Official Mock Exam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSelected = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mock Exam Timer & Navigation Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30">
        <div>
          <div className="text-xs font-bold text-slate-900">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Answered: {Object.keys(answers).length} / {questions.length}
          </div>
        </div>

        {/* Question Palette */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm py-1">
          {questions.map((q, idx) => {
            const hasAnswer = Boolean(answers[q.id]);
            const isCurr = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-md text-[11px] font-bold flex items-center justify-center border transition-all ${
                  isCurr
                    ? 'ring-2 ring-teal-500 border-teal-700 bg-teal-700 text-white'
                    : hasAnswer
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono font-bold text-rose-700">
            <Clock className="w-4 h-4 text-rose-600" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            type="button"
            id="btn-submit-mock-exam"
            onClick={() => handleSubmitMock(false)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Submit Test
          </button>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <QuestionRenderer
            question={currentQuestion}
            selectedAnswer={currentSelected}
            onSelectAnswer={(val) => {
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: val,
              }));
            }}
          />

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold disabled:opacity-30 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-save-next"
                onClick={handleSaveAndNext}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Save & Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
