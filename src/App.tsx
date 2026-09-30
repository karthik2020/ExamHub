import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Footer } from './components/common/Footer';
import { Header } from './components/common/Header';
import { PublicFooter } from './components/common/PublicFooter';
import { PublicHeader } from './components/common/PublicHeader';
import { ProfileModal } from './components/common/ProfileModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';

// Public Pages
import { CMSDynamicPage } from './features/public/CMSDynamicPage';
import { HomePage } from './features/public/HomePage';
import { PracticePage } from './features/public/PracticePage';
import { HowItWorksPage } from './features/public/HowItWorksPage';
import { FeaturesPage } from './features/public/FeaturesPage';
import { PricingPage } from './features/public/PricingPage';
import { FAQPage } from './features/public/FAQPage';
import { AboutPage } from './features/public/AboutPage';
import { ContactPage } from './features/public/ContactPage';

// Student Portal Pages
import { AttemptResults } from './features/student/AttemptResults';
import { CheckoutSuccessPage } from './features/student/CheckoutSuccessPage';
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
import { PracticeTestManager } from './features/admin/PracticeTestManager';
import { QuestionBankManager } from './features/admin/QuestionBankManager';
import { TenantBrandingEditor } from './features/admin/TenantBrandingEditor';
import { UserManagement } from './features/admin/UserManagement';

const PublicLayout: React.FC<{ children: React.ReactNode; onOpenProfile: () => void }> = ({
  children,
  onOpenProfile,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <PublicHeader onOpenAuthModal={onOpenProfile} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
};

const StudentPortalLayoutWrapper: React.FC<{ onOpenProfile: () => void }> = ({ onOpenProfile }) => (
  <div className="min-h-screen flex flex-col bg-slate-100/70">
    <Header onOpenProfileModal={onOpenProfile} />
    <StudentLayout />
    <Footer />
  </div>
);

const MainRouter: React.FC = () => {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { loginModalOpen, setLoginModalOpen } = useAuth();
  const { studentPortalPath, availableTenants } = useTenant();

  const isModalOpen = profileModalOpen || loginModalOpen;
  const handleCloseModal = () => {
    setProfileModalOpen(false);
    setLoginModalOpen(false);
  };

  return (
    <>
      <ProfileModal isOpen={isModalOpen} onClose={handleCloseModal} />

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
          path="/practice"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <PracticePage />
            </PublicLayout>
          }
        />
        <Route
          path="/how-it-works"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <HowItWorksPage />
            </PublicLayout>
          }
        />
        <Route
          path="/features"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <FeaturesPage />
            </PublicLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <PricingPage />
            </PublicLayout>
          }
        />
        <Route
          path="/faq"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <FAQPage />
            </PublicLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <AboutPage />
            </PublicLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicLayout onOpenProfile={() => setProfileModalOpen(true)}>
              <ContactPage />
            </PublicLayout>
          }
        />

        {/* Dynamic Fallback CMS Pages */}
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

        {/* Dynamic Student Portal Routes - Supported Paths (/ems, /portal, or dynamic tenant student_path) */}
        <Route
          path="/ems"
          element={<StudentPortalLayoutWrapper onOpenProfile={() => setProfileModalOpen(true)} />}
        >
          <Route index element={<StudentDashboard />} />
          <Route path="practice" element={<PracticeSession />} />
          <Route path="mock-tests" element={<MockTestSession />} />
          <Route path="results/:attemptId" element={<AttemptResults />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="study-plan" element={<StudyPlanView />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        </Route>

        <Route
          path="/portal"
          element={<StudentPortalLayoutWrapper onOpenProfile={() => setProfileModalOpen(true)} />}
        >
          <Route index element={<StudentDashboard />} />
          <Route path="practice" element={<PracticeSession />} />
          <Route path="mock-tests" element={<MockTestSession />} />
          <Route path="results/:attemptId" element={<AttemptResults />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="study-plan" element={<StudyPlanView />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        </Route>

        {studentPortalPath !== '/ems' && studentPortalPath !== '/portal' && (
          <Route
            path={studentPortalPath}
            element={<StudentPortalLayoutWrapper onOpenProfile={() => setProfileModalOpen(true)} />}
          >
            <Route index element={<StudentDashboard />} />
            <Route path="practice" element={<PracticeSession />} />
            <Route path="mock-tests" element={<MockTestSession />} />
            <Route path="results/:attemptId" element={<AttemptResults />} />
            <Route path="progress" element={<StudentProgress />} />
            <Route path="study-plan" element={<StudyPlanView />} />
            <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          </Route>
        )}

        {/* Admin Portal Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="branding" element={<TenantBrandingEditor />} />
          <Route path="questions" element={<QuestionBankManager />} />
          <Route path="tests" element={<PracticeTestManager />} />
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
