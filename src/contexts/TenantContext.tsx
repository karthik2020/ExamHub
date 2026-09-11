import React, { createContext, useContext, useEffect, useState } from 'react';
import { tenantService } from '../services/tenantService';
import { Tenant } from '../types';

interface TenantContextValue {
  currentTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  availableTenants: Tenant[];
  switchTenant: (slug: string) => Promise<void>;
  updateBranding: (updates: Partial<Tenant>) => Promise<void>;
  studentPortalPath: string;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
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

  const loadTenants = async () => {
    try {
      setLoading(true);
      const list = await tenantService.getTenants();
      setAvailableTenants(list);

      // Check URL search param or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const requestedSlug = urlParams.get('tenant') || localStorage.getItem('examhub_tenant_slug') || 'dmathub';

      const matched = list.find((t) => t.slug === requestedSlug) || list[0];
      if (matched) {
        setCurrentTenant(matched);
        applyTenantStyling(matched);
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
    } catch (err: any) {
      console.error('Failed to switch tenant:', err);
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
