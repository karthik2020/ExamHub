import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  FileQuestion,
  Filter,
  Layers,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { QuestionRenderer } from '../../components/questions/QuestionRenderer';
import { useTenant } from '../../contexts/TenantContext';
import { adminService } from '../../services/adminService';
import { examService } from '../../services/examService';
import { Difficulty, ExamSection, Question, QuestionType, Topic } from '../../types';

const ALL_QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SINGLE_MCQ', label: 'Single Choice (MCQ)' },
  { value: 'MULTI_MCQ', label: 'Multiple Choice (Multi-Select)' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'NUMERICAL', label: 'Numerical Entry' },
  { value: 'TEXT', label: 'Short Text Entry' },
  { value: 'IMAGE', label: 'Image-Based Question' },
  { value: 'PASSAGE', label: 'Passage / Case Study' },
  { value: 'FIGURE_SEQUENCE', label: 'Figure Sequence Matrix' },
];

export const QuestionBankManager: React.FC = () => {
  const { currentTenant, activeExam } = useTenant();

  // Dynamic Exam Structure
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Filtering State
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Questions Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Question Authoring Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionId, setNewSectionId] = useState<string>('');
  const [newTopicId, setNewTopicId] = useState<string>('');
  const [modalTopics, setModalTopics] = useState<Topic[]>([]);
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

  // Load sections when activeExam changes
  useEffect(() => {
    let isCancelled = false;
    setSelectedSectionId('');
    setSelectedTopicId('');
    setPreviewQuestion(null);

    if (!activeExam) {
      setSections([]);
      setTopics([]);
      return;
    }

    examService
      .getSections(activeExam.id)
      .then((sList) => {
        if (isCancelled) return;
        setSections(sList);
        if (sList.length > 0) {
          setNewSectionId(sList[0].id);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load sections for question bank:', err);
          setSections([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeExam?.id]);

  // Load topics when selectedSectionId changes (filter bar)
  useEffect(() => {
    let isCancelled = false;
    if (!selectedSectionId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }

    examService
      .getTopics(selectedSectionId)
      .then((tList) => {
        if (isCancelled) return;
        setTopics(tList);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load topics for section:', err);
          setTopics([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSectionId]);

  // Load topics when newSectionId changes in the authoring modal
  useEffect(() => {
    let isCancelled = false;
    if (!newSectionId) {
      setModalTopics([]);
      setNewTopicId('');
      return;
    }

    examService
      .getTopics(newSectionId)
      .then((tList) => {
        if (isCancelled) return;
        setModalTopics(tList);
        if (tList.length > 0) {
          setNewTopicId(tList[0].id);
        } else {
          setNewTopicId('');
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load modal topics:', err);
          setModalTopics([]);
          setNewTopicId('');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [newSectionId]);

  // Fetch Questions based on active tenant, active exam, and active filters
  const loadQuestions = async () => {
    if (!activeExam) {
      setQuestions([]);
      setPreviewQuestion(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getQuestions({
        tenant_id: currentTenant?.id,
        exam_id: activeExam.id,
        section_id: selectedSectionId || undefined,
        topic_id: selectedTopicId || undefined,
        question_type: selectedQuestionType || undefined,
        difficulty: selectedDifficulty || undefined,
        status: selectedStatus || undefined,
      });

      setQuestions(data);
      if (data.length > 0) {
        if (!previewQuestion || !data.some((q) => q.id === previewQuestion.id)) {
          setPreviewQuestion(data[0]);
        }
      } else {
        setPreviewQuestion(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [
    activeExam?.id,
    currentTenant?.id,
    selectedSectionId,
    selectedTopicId,
    selectedQuestionType,
    selectedDifficulty,
    selectedStatus,
  ]);

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question from the bank?')) return;
    try {
      await adminService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (previewQuestion?.id === id) {
        const remaining = questions.filter((q) => q.id !== id);
        setPreviewQuestion(remaining[0] || null);
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !activeExam) {
      alert('Active tenant and examination must be selected.');
      return;
    }
    if (!newSectionId) {
      alert('Please select a section for this question.');
      return;
    }

    try {
      const optionsToSave =
        newType === 'NUMERICAL' || newType === 'TEXT'
          ? []
          : newOptions.map((opt) => ({
              id: `opt-${Math.random().toString(36).slice(2, 8)}`,
              question_id: '',
              option_key: opt.key,
              option_text: opt.text,
              is_correct: opt.key === newCorrectAnswer,
            }));

      const created = await adminService.createQuestion({
        tenant_id: currentTenant.id,
        exam_id: activeExam.id,
        section_id: newSectionId,
        topic_id: newTopicId || undefined,
        question_text: newQuestionText,
        question_type: newType,
        difficulty: newDifficulty,
        correct_answer: newCorrectAnswer,
        explanation: newExplanation,
        options: optionsToSave,
      });

      setQuestions((prev) => [created, ...prev]);
      setPreviewQuestion(created);
      setShowAddModal(false);

      // Reset form fields
      setNewQuestionText('');
      setNewExplanation('');
      setNewOptions([
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ]);
    } catch (err: any) {
      alert(`Failed to save question: ${err.message}`);
    }
  };

  const resetFilters = () => {
    setSelectedSectionId('');
    setSelectedTopicId('');
    setSelectedQuestionType('');
    setSelectedDifficulty('');
    setSelectedStatus('');
  };

  const hasActiveFilters = Boolean(
    selectedSectionId || selectedTopicId || selectedQuestionType || selectedDifficulty || selectedStatus
  );

  if (!activeExam) {
    return (
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Active Examination Configured</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The selected tenant ({currentTenant?.name || 'Unknown'}) does not currently have an active examination.
          Please switch to a tenant with active exams to browse and manage questions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Question Bank Management</h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              {activeExam.name}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Browse, author, and preview questions across sections, topics, and assessment types for {activeExam.name}.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-new-question"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Author New Question</span>
        </button>
      </div>

      {/* Dynamic Multi-Dimensional Filter Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Filter className="w-4 h-4 text-teal-400" />
            <span>Question Bank Filters</span>
            <span className="text-[10px] text-slate-500 font-mono">({questions.length} matched)</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Section Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exam Section</label>
            <select
              id="filter-section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer focus:outline-hidden focus:border-teal-400"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Topic</label>
            <select
              id="filter-topic"
              value={selectedTopicId}
              disabled={!selectedSectionId || topics.length === 0}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer focus:outline-hidden focus:border-teal-400 disabled:opacity-50"
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Question Type</label>
            <select
              id="filter-type"
              value={selectedQuestionType}
              onChange={(e) => setSelectedQuestionType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer focus:outline-hidden focus:border-teal-400"
            >
              <option value="">All Question Types</option>
              {ALL_QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty & Status Filters */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Difficulty</label>
            <div className="grid grid-cols-4 gap-1">
              {(['', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-1 text-[11px] rounded-lg font-semibold transition-colors cursor-pointer text-center ${
                    selectedDifficulty === diff
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {diff === '' ? 'All' : diff}
                </button>
              ))}
            </div>
          </div>
        </div>
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

      {/* Main Two-Column View: List & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question List Column */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
            <span>
              {loading ? 'Refreshing questions...' : `Showing ${questions.length} questions in ${activeExam.name}`}
            </span>
          </div>

          {questions.length === 0 && !loading ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <FileQuestion className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No questions found matching your filter criteria.</p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-teal-400 hover:underline text-xs font-semibold cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
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
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
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
          )}
        </div>

        {/* Live Visual Preview Column */}
        <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Authoritative Visual Rendering Preview
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
            <div className="py-24 text-center text-slate-500 text-xs">
              Select a question from the left list to inspect its live interactive rendering.
            </div>
          )}
        </div>
      </div>

      {/* Author New Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Author New Assessment Item</h3>
                <p className="text-[11px] text-slate-400">
                  Adding to {currentTenant?.name} &bull; {activeExam.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              {/* Hierarchy Context: Section and Topic */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Target Section *</label>
                  <select
                    value={newSectionId}
                    onChange={(e) => setNewSectionId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Topic (Optional)</label>
                  <select
                    value={newTopicId}
                    onChange={(e) => setNewTopicId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">General Section Level</option>
                    {modalTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Type and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Question Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as QuestionType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {ALL_QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Difficulty Level *</label>
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

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase font-semibold">Question Statement / Problem *</label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter problem statement or prompt..."
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              {/* Options for Choice questions */}
              {newType !== 'NUMERICAL' && newType !== 'TEXT' && (
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
                          placeholder={`Option ${opt.key} content`}
                          required
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer & Explanation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 uppercase font-semibold">Correct Answer Key *</label>
                  {newType === 'NUMERICAL' || newType === 'TEXT' ? (
                    <input
                      type="text"
                      value={newCorrectAnswer}
                      onChange={(e) => setNewCorrectAnswer(e.target.value)}
                      placeholder="e.g. 42 or expected text"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  ) : (
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
                  )}
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

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
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
