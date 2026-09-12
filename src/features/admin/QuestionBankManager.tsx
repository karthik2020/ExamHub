import React, { useEffect, useState } from 'react';
import {
  Eye,
  FileQuestion,
  Filter,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useTenant } from '../../contexts/TenantContext';
import { adminService } from '../../services/adminService';
import { Difficulty, Question, QuestionType } from '../../types';

export const QuestionBankManager: React.FC = () => {
  const { currentTenant } = useTenant();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // New Question Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MEDIUM');
  const [newType, setNewType] = useState<QuestionType>('SINGLE_MCQ');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('A');
  const [newExplanation, setNewExplanation] = useState('');
  const [newOptions, setNewOptions] = useState([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getQuestions({
        difficulty: selectedDifficulty || undefined,
      });
      setQuestions(data);
      if (data[0] && !previewQuestion) {
        setPreviewQuestion(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedDifficulty, currentTenant?.id]);

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question from the bank?')) return;
    try {
      await adminService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (previewQuestion?.id === id) setPreviewQuestion(null);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createQuestion({
        tenant_id: currentTenant?.id,
        exam_id: 'e0000000-0000-0000-0000-000000000001',
        section_id: 's0000000-0000-0000-0000-000000000002',
        question_text: newQuestionText,
        question_type: newType,
        difficulty: newDifficulty,
        correct_answer: newCorrectAnswer,
        explanation: newExplanation,
        options: newOptions.map((opt) => ({
          id: `opt-${Math.random().toString(36).slice(2, 8)}`,
          question_id: '',
          option_key: opt.key,
          option_text: opt.text,
          is_correct: opt.key === newCorrectAnswer,
        })),
      });

      setQuestions((prev) => [created, ...prev]);
      setPreviewQuestion(created);
      setShowAddModal(false);
      // Reset form
      setNewQuestionText('');
      setNewExplanation('');
    } catch (err: any) {
      alert(`Failed to save question: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Question Bank Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, author, and preview figure sequences and academic multiple-choice questions.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-new-question"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Author New Question</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-semibold uppercase text-[10px]">Filter Difficulty:</span>
        </div>
        {(['', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
          <button
            key={diff}
            type="button"
            onClick={() => setSelectedDifficulty(diff)}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              selectedDifficulty === diff
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {diff === '' ? 'All Difficulties' : diff}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadQuestions}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question List */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
            <span>Showing {questions.length} questions</span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isSelected = previewQuestion?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setPreviewQuestion(q)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'border-teal-500 bg-slate-800/80 ring-1 ring-teal-500/30'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {q.question_type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : q.difficulty === 'MEDIUM'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(q.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2">{q.question_text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Visual Preview Column */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Live Interactive Visual Preview
            </h3>
            {previewQuestion && (
              <span className="text-xs text-teal-400 font-mono">
                Answer: {previewQuestion.correct_answer}
              </span>
            )}
          </div>

          {previewQuestion ? (
            <div className="bg-white rounded-xl p-5 text-slate-900 border border-slate-200">
              <QuestionRenderer
                question={previewQuestion}
                selectedAnswer={previewQuestion.correct_answer}
                onSelectAnswer={() => {}}
                result={{
                  attempt_id: 'preview',
                  question_id: previewQuestion.id,
                  selected_answer: previewQuestion.correct_answer,
                  is_correct: true,
                  correct_answer: previewQuestion.correct_answer,
                  explanation: previewQuestion.explanation,
                  solution: previewQuestion.solution,
                  time_spent_seconds: 0,
                  marks_awarded: 1,
                }}
              />
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a question from the left column to view its live visual rendering.
            </div>
          )}
        </div>
      </div>

      {/* Author New Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">Author New Assessment Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Question Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as QuestionType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="SINGLE_MCQ">Standard Single MCQ</option>
                    <option value="MULTI_MCQ">Multiple Choice</option>
                    <option value="FIGURE_SEQUENCE">Figure Sequence Matrix</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase font-semibold">Question Text / Problem</label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter problem statement..."
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="text-slate-400 uppercase font-semibold">Answer Options</label>
                <div className="grid grid-cols-2 gap-2">
                  {newOptions.map((opt, i) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <span className="font-bold text-teal-400">{opt.key}:</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[i].text = e.target.value;
                          setNewOptions(updated);
                        }}
                        placeholder={`Option ${opt.key} text`}
                        required
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Correct Answer Key</label>
                  <select
                    value={newCorrectAnswer}
                    onChange={(e) => setNewCorrectAnswer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Analytical Explanation</label>
                  <input
                    type="text"
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Step-by-step logic..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
