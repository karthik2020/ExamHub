import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { Attempt, ExamSection, Topic } from '../../types';

interface SectionWithTopics {
  section: ExamSection;
  topics: Topic[];
  completedCount: number;
}

export const StudyPlanView: React.FC = () => {
  const { currentTenant, studentPortalPath, activeExam } = useTenant();
  const { user } = useAuth();

  const [sectionData, setSectionData] = useState<SectionWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (!activeExam?.id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [sections, history] = await Promise.all([
          examService.getSections(activeExam.id),
          attemptService.getUserHistory(user.id).catch(() => [] as Attempt[]),
        ]);

        if (!isMounted) return;

        // Group completed attempts
        const completedAttempts = history.filter(
          (a) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED'
        );
        setTotalAttempts(completedAttempts.length);

        // Fetch topics for each section
        const sectionPromises = sections.map(async (sec, idx) => {
          const topics = await examService.getTopics(sec.id).catch(() => [] as Topic[]);
          return {
            section: sec,
            topics,
            completedCount: Math.min(topics.length, completedAttempts.length > idx ? topics.length : completedAttempts.length),
          };
        });

        const resolved = await Promise.all(sectionPromises);
        if (isMounted) {
          setSectionData(resolved);
        }
      } catch (err) {
        console.error('Failed to load study plan data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeExam?.id, currentTenant?.id, user.id]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            Structured Preparation Pathway • {activeExam?.name || currentTenant?.name}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeExam?.name || 'Examination'} Curriculum & Study Plan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Follow the syllabus modules and complete focused drills to build mastery across all examination domains.
          </p>
        </div>

        <Link
          to={`${studentPortalPath}/practice`}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <span>Resume Practice</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading curriculum syllabus...</div>
      ) : sectionData.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Curriculum Syllabus in Development</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The study plan modules for {activeExam?.name || 'this exam'} are being updated by the content team. You can
            still access full practice drills and mock simulations.
          </p>
          <div className="pt-2">
            <Link
              to={`${studentPortalPath}/practice`}
              className="inline-block px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800"
            >
              Start Practice Drill
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sectionData.map(({ section, topics }, sIdx) => {
            const hasTopics = topics.length > 0;

            return (
              <div
                key={section.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-black flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">{section.name}</h2>
                      {section.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{section.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-slate-500">
                      {section.question_count ? `${section.question_count} Questions` : 'Core Section'}
                    </span>
                    <Link
                      to={`${studentPortalPath}/practice?section_id=${section.id}`}
                      className="px-3 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Start Drill</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Topics Grid */}
                {hasTopics ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {topics.map((t, tIdx) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex flex-col justify-between gap-2 hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                            <span>Topic {tIdx + 1}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              Core
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs font-medium leading-snug">{t.name}</p>
                          {t.description && (
                            <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">{t.description}</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Curriculum standard</span>
                          <Link
                            to={`${studentPortalPath}/practice?section_id=${section.id}`}
                            className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-0.5"
                          >
                            <span>Drill</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>Curriculum topics being finalized for this section.</span>
                    <Link
                      to={`${studentPortalPath}/practice?section_id=${section.id}`}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Practice Available Questions
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
