import React, { createContext, useContext, useEffect, useState } from 'react';
import { examService } from '../services/examService';
import { tenantService } from '../services/tenantService';
import { Exam, Tenant } from '../types';

interface TenantContextValue {
  currentTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  availableTenants: Tenant[];
  switchTenant: (slug: string) => Promise<void>;
  updateBranding: (updates: Partial<Tenant>) => Promise<void>;
  studentPortalPath: string;
  exams: Exam[];
  activeExam: Exam | null;
  activeExamId: string | null;
  setActiveExamId: (examId: string) => void;
  refreshExams: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExamId, setActiveExamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyTenantStyling = (tenant: Tenant) => {
    const root = document.documentElement;
    root.style.setProperty('--tenant-primary', tenant.primary_color);
    root.style.setProperty('--tenant-secondary', tenant.secondary_color);

    // Update document title and favicon dynamically
    document.title = `${tenant.name} — ExamHub Engine`;
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (favicon && tenant.favicon_url) {
      favicon.href = tenant.favicon_url;
    }
  };

  const loadExamsForTenant = async (tenantId: string) => {
    try {
      const examList = await examService.getExams(tenantId);
      setExams(examList);

      // Check saved preference or default
      const savedExamId = localStorage.getItem(`examhub_active_exam_${tenantId}`);
      if (savedExamId && examList.some((e) => e.id === savedExamId)) {
        setActiveExamIdState(savedExamId);
      } else if (examList.length > 0) {
        setActiveExamIdState(examList[0].id);
      } else {
        setActiveExamIdState(null);
      }
    } catch (err: any) {
      console.error('Failed to load exams for tenant:', err);
      setExams([]);
      setActiveExamIdState(null);
    }
  };

  const loadTenants = async () => {
    try {
      setLoading(true);
      const list = await tenantService.getTenants();
      setAvailableTenants(list);

      // Check URL search param, then pathname match, then localStorage, then default
      const urlParams = new URLSearchParams(window.location.search);
      const querySlug = urlParams.get('tenant');
      const currentPath = window.location.pathname;

      let matched: Tenant | undefined;
      if (querySlug) {
        matched = list.find((t) => t.slug === querySlug);
      } else {
        // Pathname match e.g. /portal for nismprep, /ems for dmathub
        matched = list.find((t) => t.student_path && currentPath.startsWith(t.student_path));
        if (!matched) {
          const storedSlug = localStorage.getItem('examhub_tenant_slug');
          if (storedSlug) {
            matched = list.find((t) => t.slug === storedSlug);
          }
        }
      }

      const tenantToUse = matched || list[0];
      if (tenantToUse) {
        setCurrentTenant(tenantToUse);
        applyTenantStyling(tenantToUse);
        await loadExamsForTenant(tenantToUse.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const switchTenant = async (slug: string) => {
    try {
      const tenant = await tenantService.getTenantBySlug(slug);
      setCurrentTenant(tenant);
      localStorage.setItem('examhub_tenant_slug', slug);
      applyTenantStyling(tenant);
      await loadExamsForTenant(tenant.id);
    } catch (err: any) {
      console.error('Failed to switch tenant:', err);
    }
  };

  const setActiveExamId = (examId: string) => {
    setActiveExamIdState(examId);
    if (currentTenant) {
      localStorage.setItem(`examhub_active_exam_${currentTenant.id}`, examId);
    }
  };

  const refreshExams = async () => {
    if (currentTenant) {
      await loadExamsForTenant(currentTenant.id);
    }
  };

  const updateBranding = async (updates: Partial<Tenant>) => {
    if (!currentTenant) return;
    try {
      const updated = await tenantService.updateTenant(currentTenant.id, updates);
      setCurrentTenant(updated);
      applyTenantStyling(updated);
      setAvailableTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      console.error('Failed to update tenant branding:', err);
      throw err;
    }
  };

  const studentPortalPath = currentTenant?.student_path || '/ems';
  const activeExam = exams.find((e) => e.id === activeExamId) || (exams.length > 0 ? exams[0] : null);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        loading,
        error,
        availableTenants,
        switchTenant,
        updateBranding,
        studentPortalPath,
        exams,
        activeExam,
        activeExamId,
        setActiveExamId,
        refreshExams,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextValue => {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return ctx;
};
