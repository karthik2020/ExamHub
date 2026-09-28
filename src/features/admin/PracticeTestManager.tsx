import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Clock,
  Cpu,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { adminService } from '../../services/adminService';
import { examService } from '../../services/examService';
import { ExamSection, PracticeTest, Topic } from '../../types';

export const PracticeTestManager: React.FC = () => {
  const { currentTenant, activeExam } = useTenant();

  // Active view tab: 'TESTS' or 'STRUCTURE'
  const [activeTab, setActiveTab] = useState<'TESTS' | 'STRUCTURE'>('TESTS');

  // Tests State
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Sections & Topics State
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Modal: Create Practice / Mock Test
  const [showTestModal, setShowTestModal] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testType, setTestType] = useState<'PRACTICE' | 'MOCK' | 'DIAGNOSTIC'>('PRACTICE');
  const [selectionMode, setSelectionMode] = useState<'FIXED' | 'GENERATED' | 'RANDOM'>('FIXED');
  const [testDifficulty, setTestDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'ALL'>('MEDIUM');
  const [testSectionId, setTestSectionId] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [submittingTest, setSubmittingTest] = useState(false);

  // Modal: Create Section
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionOrder, setSectionOrder] = useState(1);
  const [submittingSection, setSubmittingSection] = useState(false);

  // Modal: Create Topic
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedSectionForTopic, setSelectedSectionForTopic] = useState<string>('');
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicOrder, setTopicOrder] = useState(1);
  const [submittingTopic, setSubmittingTopic] = useState(false);

  // Load Tests
  const fetchTests = () => {
    if (!currentTenant || !activeExam) return;
    setLoadingTests(true);
    setTestError(null);

    examService
      .getPracticeTests(currentTenant.id, activeExam.id)
      .then((data) => {
        setTests(data);
        setTestError(null);
      })
      .catch((err: any) => {
        setTestError(err.message || 'Failed to load practice tests');
      })
      .finally(() => setLoadingTests(false));
  };

  // Load Structure (Sections & Topics)
  const fetchStructure = () => {
    if (!activeExam) return;
    setLoadingStructure(true);

    examService
      .getSections(activeExam.id)
      .then(async (secList) => {
        setSections(secList);
        if (secList.length > 0) {
          const allTopics: Topic[] = [];
          for (const s of secList) {
            try {
              const tList = await examService.getTopics(s.id);
              allTopics.push(...tList);
            } catch (e) {
              console.warn('Failed to load topics for section', s.id);
            }
          }
          setTopics(allTopics);
        } else {
          setTopics([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load sections:', err);
      })
      .finally(() => setLoadingStructure(false));
  };

  useEffect(() => {
    fetchTests();
    fetchStructure();
  }, [currentTenant?.id, activeExam?.id]);

  // Handle Create Test
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !activeExam || !testName.trim()) return;

    setSubmittingTest(true);
    try {
      await adminService.createPracticeTest({
        tenant_id: currentTenant.id,
        exam_id: activeExam.id,
        section_id: testSectionId || null,
        name: testName.trim(),
        description: testDescription.trim(),
        test_type: testType,
        difficulty: testDifficulty,
        question_selection_mode: selectionMode,
        question_count: Number(questionCount),
        time_limit_minutes: Number(timeLimitMinutes),
        is_published: true,
      });

      setShowTestModal(false);
      setTestName('');
      setTestDescription('');
      fetchTests();
    } catch (err: any) {
      alert(`Error creating practice test: ${err.message}`);
    } finally {
      setSubmittingTest(false);
    }
  };

  // Handle Delete Test
  const handleDeleteTest = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete test "${name}"?`)) return;

    try {
      await adminService.deletePracticeTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(`Error deleting test: ${err.message}`);
    }
  };

  // Handle Create Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !activeExam || !sectionName.trim()) return;

    setSubmittingSection(true);
    try {
      await adminService.createSection({
        tenant_id: currentTenant.id,
        exam_id: activeExam.id,
        name: sectionName.trim(),
        description: sectionDescription.trim(),
        display_order: Number(sectionOrder),
        status: 'ACTIVE',
      });

      setShowSectionModal(false);
      setSectionName('');
      setSectionDescription('');
      fetchStructure();
    } catch (err: any) {
      alert(`Error creating section: ${err.message}`);
    } finally {
      setSubmittingSection(false);
    }
  };

  // Handle Create Topic
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !selectedSectionForTopic || !topicName.trim()) return;

    setSubmittingTopic(true);
    try {
      await adminService.createTopic({
        tenant_id: currentTenant.id,
        section_id: selectedSectionForTopic,
        name: topicName.trim(),
        description: topicDescription.trim(),
        display_order: Number(topicOrder),
      });

      setShowTopicModal(false);
      setTopicName('');
      setTopicDescription('');
      fetchStructure();
    } catch (err: any) {
      alert(`Error creating topic: ${err.message}`);
    } finally {
      setSubmittingTopic(false);
    }
  };

  // Filtered tests
  const filteredTests = tests.filter((t) => {
    if (typeFilter !== 'ALL' && t.test_type !== typeFilter) return false;
    if (modeFilter !== 'ALL' && t.question_selection_mode !== modeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Curriculum & Practice Test Operations</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure curriculum hierarchy (Sections & Topics) and publish Practice & Mock tests for{' '}
              <span className="text-sky-400 font-semibold">{activeExam?.name || 'Active Exam'}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex">
              <button
                type="button"
                onClick={() => setActiveTab('TESTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'TESTS'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Practice Tests & Mocks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STRUCTURE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'STRUCTURE'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sections & Topics
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'TESTS' ? (
        <>
          {/* Action & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 border border-slate-800/80 p-4 rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="ALL">All Types</option>
                  <option value="PRACTICE">Practice Drills</option>
                  <option value="MOCK">Mock Examinations</option>
                  <option value="DIAGNOSTIC">Diagnostic</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="ALL">All Modes</option>
                  <option value="FIXED">Fixed Bank</option>
                  <option value="GENERATED">Procedural Generated</option>
                  <option value="RANDOM">Random Sample</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTests}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Practice / Mock Test</span>
              </button>
            </div>
          </div>

          {/* Tests Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Configured Tests ({filteredTests.length})</h3>
              <span className="text-xs text-slate-400">Available to student candidates</span>
            </div>

            {loadingTests ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading practice tests...</div>
            ) : filteredTests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No practice tests match criteria</p>
                <p className="text-xs text-slate-500">Create a new test or mock exam to populate the student portal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Test Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Selection Mode</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Questions</th>
                      <th className="py-3 px-4">Time Limit</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredTests.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="font-semibold text-white">{t.name}</div>
                          {t.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">{t.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.test_type === 'MOCK'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : t.test_type === 'DIAGNOSTIC'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-teal-950 text-teal-300 border border-teal-800'
                            }`}
                          >
                            {t.test_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              t.question_selection_mode === 'GENERATED'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {t.question_selection_mode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">{t.difficulty}</td>
                        <td className="py-3.5 px-4 font-mono">{t.question_count} items</td>
                        <td className="py-3.5 px-4 font-mono">{t.time_limit_minutes} mins</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTest(t.id, t.name)}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                            title="Delete test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Sections & Topics Structure View */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-950/50 border border-slate-800/80 p-4 rounded-xl">
            <div>
              <h3 className="font-bold text-white text-sm">Exam Curriculum Structure</h3>
              <p className="text-xs text-slate-400">
                Syllabus modules and topics associated with {activeExam?.name}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSectionModal(true)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sections.length === 0) {
                    alert('Please create at least one section first.');
                    return;
                  }
                  setSelectedSectionForTopic(sections[0].id);
                  setShowTopicModal(true);
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </div>
          </div>

          {loadingStructure ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading syllabus structure...</div>
          ) : sections.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No sections defined for this exam</p>
              <p className="text-xs text-slate-500">
                Click "Add Section" to define the first syllabus module.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((sec, idx) => {
                const secTopics = topics.filter((t) => t.section_id === sec.id);

                return (
                  <div
                    key={sec.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-black flex items-center justify-center border border-teal-500/30">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-sm">{sec.name}</h4>
                          {sec.description && (
                            <p className="text-xs text-slate-400">{sec.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSectionForTopic(sec.id);
                            setShowTopicModal(true);
                          }}
                          className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Topic</span>
                        </button>
                      </div>
                    </div>

                    {/* Topics Grid */}
                    {secTopics.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-500">
                        No topics added to this section yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {secTopics.map((t, tIdx) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-slate-400 font-semibold text-[10px] uppercase">
                              <span>Topic {tIdx + 1}</span>
                            </div>
                            <div className="font-bold text-white">{t.name}</div>
                            {t.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Practice / Mock Test */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Configure New Examination / Drill</h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Test Title *</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. Full Timed Mock Exam 1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Detailed instructions or candidate description..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Test Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PRACTICE">Practice Drill</option>
                    <option value="MOCK">Timed Mock Examination</option>
                    <option value="DIAGNOSTIC">Diagnostic Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Question Selection Mode</label>
                  <select
                    value={selectionMode}
                    onChange={(e) => setSelectionMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="FIXED">Fixed Bank</option>
                    <option value="GENERATED">Procedural (Pro Only)</option>
                    <option value="RANDOM">Random Pool</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Difficulty</label>
                  <select
                    value={testDifficulty}
                    onChange={(e) => setTestDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Question Count</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTest}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingTest ? 'Publishing...' : 'Publish Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Section */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Add Curriculum Section</h3>
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Quantitative Problem Solving"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={sectionDescription}
                  onChange={(e) => setSectionDescription(e.target.value)}
                  placeholder="Overview of syllabus module..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={sectionOrder}
                  onChange={(e) => setSectionOrder(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSection}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingSection ? 'Saving...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Add Curriculum Topic</h3>
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parent Section</label>
                <select
                  value={selectedSectionForTopic}
                  onChange={(e) => setSelectedSectionForTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic Name *</label>
                <input
                  type="text"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. Modular Arithmetic & Clock Cycles"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Competency areas and concepts..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTopic}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingTopic ? 'Saving...' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
