import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/common/Footer';
import { Header } from './components/common/Header';
import { ProfileModal } from './components/common/ProfileModal';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';

// Public Pages
import { CMSDynamicPage } from './features/public/CMSDynamicPage';
import { HomePage } from './features/public/HomePage';

// Student Portal Pages
import { AttemptResults } from './features/student/AttemptResults';
import { MockTestSession } from './features/student/MockTestSession';
import { PracticeSession } from './features/student/PracticeSession';
import { StudentDashboard } from './features/student/StudentDashboard';
import { StudentLayout } from './features/student/StudentLayout';
import { StudentProgress } from './features/student/StudentProgress';
import { StudyPlanView } from './features/student/StudyPlanView';

// Admin Portal Pages
import { AdminLayout } from './features/admin/AdminLayout';
import { AdminOverview } from './features/admin/AdminOverview';
import { AuditLogsView } from './features/admin/AuditLogsView';
import { GeneratorWorkbench } from './features/admin/GeneratorWorkbench';
import { QuestionBankManager } from './features/admin/QuestionBankManager';
import { TenantBrandingEditor } from './features/admin/TenantBrandingEditor';
import { UserManagement } from './features/admin/UserManagement';

const PublicLayout: React.FC<{ children: React.ReactNode; onOpenProfile: () => void }> = ({
  children,
  onOpenProfile,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Header onOpenProfileModal={onOpenProfile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

const MainRouter: React.FC = () => {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { studentPortalPath } = useTenant();

  return (
    <>
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <Routes>
        {/* Public Website Routes */}
        <Route
          path="/"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <HomePage />
            </PublicLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="about" />
            </PublicLayout>
          }
        />
        <Route
          path="/exam"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="exam" />
            </PublicLayout>
          }
        />
        <Route
          path="/syllabus"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="syllabus" />
            </PublicLayout>
          }
        />
        <Route
          path="/preparation"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="preparation" />
            </PublicLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="pricing" />
            </PublicLayout>
          }
        />
        <Route
          path="/faq"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage forcedSlug="faq" />
            </PublicLayout>
          }
        />

        {/* Student Portal (EMS) Routes */}
        <Route
          path="/ems"
          element={
            <div className="min-h-screen flex flex-col bg-slate-100/70">
              <Header onOpenProfileModal={() => setProfileModalOpen(true)} />
              <StudentLayout />
              <Footer />
            </div>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="practice" element={<PracticeSession />} />
          <Route path="mock-tests" element={<MockTestSession />} />
          <Route path="results/:attemptId" element={<AttemptResults />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="study-plan" element={<StudyPlanView />} />
        </Route>

        {/* Admin Portal Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="branding" element={<TenantBrandingEditor />} />
          <Route path="questions" element={<QuestionBankManager />} />
          <Route path="generator" element={<GeneratorWorkbench />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="audit-logs" element={<AuditLogsView />} />
        </Route>

        {/* Fallback Catch-All to Public Dynamic CMS or Home */}
        <Route
          path="/:slug"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <CMSDynamicPage />
            </PublicLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <MainRouter />
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}
