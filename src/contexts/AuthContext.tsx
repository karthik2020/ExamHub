import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Role, User, UserTier } from '../types';
import { UserEntitlements, resolveUserEntitlement } from '../types/entitlements';
import { apiFetch } from '../services/apiClient';

export type AuthMode = 'REAL_AUTH' | 'DEMO_MODE';

export interface TenantMembershipInfo {
  tenantId: string;
  slug: string;
  studentPath: string;
}

interface AuthContextValue {
  user: User;
  role: Role;
  tier: UserTier;
  authMode: AuthMode;
  isAuthenticated: boolean;
  emailConfirmed: boolean;
  entitlement: UserEntitlements;
  tenantMembership: TenantMembershipInfo | null;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  // Supabase Auth real methods
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; studentPath?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string; studentPath?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  // Explicit Demo / Testing Mode methods
  switchDemoProfile: (tier: UserTier, role?: Role) => void;
  enableDemoMode: (tier?: UserTier, role?: Role) => void;
  exitDemoMode: () => void;
  // Legacy aliases
  switchProfile: (tier: UserTier, role?: Role) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// Deterministic RFC 4122 UUIDs matching seed.sql for development & testing
export const DEMO_USERS: Record<string, User> = {
  GUEST: {
    id: '10000000-0000-0000-0000-000000000003',
    email: 'guest@dmathub.com',
    name: 'Guest Candidate (Demo)',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'GUEST',
  },
  REGISTERED: {
    id: '10000000-0000-0000-0000-000000000002',
    email: 'student@dmathub.com',
    name: 'Alexander Weber (Demo Member)',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'REGISTERED',
  },
  PAID: {
    id: '10000000-0000-0000-0000-000000000004',
    email: 'pro.candidate@dmathub.com',
    name: 'Sarah Schmidt (Demo Pro)',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'PAID',
  },
  SUPER_ADMIN: {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'admin@dmathub.com',
    name: 'Chief Proctor Admin (Demo)',
    status: 'ACTIVE',
    role: 'SUPER_ADMIN',
    tier: 'PAID',
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    return (localStorage.getItem('examhub_auth_mode') as AuthMode) || 'DEMO_MODE';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [tenantMembership, setTenantMembership] = useState<TenantMembershipInfo | null>(null);

  const [user, setUser] = useState<User>(() => {
    const savedTier = (localStorage.getItem('examhub_user_tier') as UserTier) || 'GUEST';
    const savedRole = (localStorage.getItem('examhub_user_role') as Role) || 'STUDENT';
    if (savedRole === 'SUPER_ADMIN') return DEMO_USERS.SUPER_ADMIN;
    return DEMO_USERS[savedTier] || DEMO_USERS.GUEST;
  });

  // Synchronize authenticated profile from PostgreSQL using validated JWT
  const syncServerProfile = async (token: string) => {
    try {
      const res = await apiFetch<{
        authenticated: boolean;
        user: (User & { tenant_id: string; email_confirmed_at: string | null; student_path: string }) | null;
        tenant: { id: string; slug: string; student_path: string } | null;
      }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.authenticated && res.user) {
        setAuthMode('REAL_AUTH');
        setIsAuthenticated(true);
        setEmailConfirmed(Boolean(res.user.email_confirmed_at));
        setUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          status: res.user.status || 'ACTIVE',
          role: res.user.role,
          tier: res.user.tier,
        });

        if (res.tenant) {
          setTenantMembership({
            tenantId: res.tenant.id,
            slug: res.tenant.slug,
            studentPath: res.tenant.student_path || '/ems',
          });
        }
        localStorage.setItem('examhub_auth_mode', 'REAL_AUTH');
        return res;
      }
    } catch (err: any) {
      console.warn('Failed to sync authenticated server profile:', err.message);
    }
    return null;
  };

  // Listen for Supabase Auth state changes & session restoration on mount
  useEffect(() => {
    if (!supabase) return;

    // Check existing persisted session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && session.access_token) {
        await syncServerProfile(session.access_token);
      } else {
        // No active Supabase session
        setIsAuthenticated(false);
        const savedMode = localStorage.getItem('examhub_auth_mode');
        if (savedMode === 'REAL_AUTH') {
          // Session expired or logged out
          setAuthMode('DEMO_MODE');
          localStorage.setItem('examhub_auth_mode', 'DEMO_MODE');
          setUser(DEMO_USERS.GUEST);
        }
      }
    });

    // Subscribe to auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && session.access_token) {
        await syncServerProfile(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setEmailConfirmed(false);
        setTenantMembership(null);
        setAuthMode('DEMO_MODE');
        localStorage.setItem('examhub_auth_mode', 'DEMO_MODE');
        setUser(DEMO_USERS.GUEST);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Supabase Real Sign In
  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client is not available.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session?.access_token) {
        const profileRes = await syncServerProfile(data.session.access_token);
        return {
          success: true,
          studentPath: profileRes?.tenant?.student_path || '/ems',
        };
      }

      return { success: false, error: 'Failed to retrieve session from Supabase.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  // Supabase Real Sign Up
  const signUpWithPassword = async (email: string, password: string, name: string) => {
    try {
      // First attempt registration through authoritative server endpoint
      const res = await apiFetch<{
        success: boolean;
        message?: string;
        user: { id: string; email: string; name: string };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        }),
      });

      if (res.success) {
        // Automatically sign in candidate with Supabase
        const signInRes = await signInWithPassword(email, password);
        if (signInRes.success) {
          return {
            success: true,
            message: 'Account registered and signed in successfully.',
            studentPath: signInRes.studentPath,
          };
        }
        return {
          success: true,
          message: 'Account registered! Please sign in with your credentials.',
        };
      }

      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      // Fallback directly to client supabase.auth.signUp if endpoint error
      if (supabase) {
        try {
          const { data: suData, error: suErr } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: {
                name: name.trim(),
                role: 'STUDENT',
                tier: 'REGISTERED',
              },
            },
          });

          if (suErr) {
            return { success: false, error: suErr.message };
          }

          if (suData.session?.access_token) {
            await syncServerProfile(suData.session.access_token);
            return { success: true, studentPath: '/ems' };
          } else if (suData.user) {
            return {
              success: true,
              message: 'Account created! Please check your email inbox to verify your address.',
            };
          }
        } catch (innerErr: any) {
          return { success: false, error: innerErr.message };
        }
      }
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  // Supabase Password Reset
  const resetPassword = async (email: string) => {
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return { success: true, message: res.message };
    } catch (err: any) {
      if (supabase) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
          if (error) return { success: false, error: error.message };
          return {
            success: true,
            message: 'Password reset link sent to your email address.',
          };
        } catch (innerErr: any) {
          return { success: false, error: innerErr.message };
        }
      }
      return { success: false, error: err.message || 'Password reset request failed' };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Signout warning:', err);
      }
    }
    setIsAuthenticated(false);
    setEmailConfirmed(false);
    setTenantMembership(null);
    setAuthMode('DEMO_MODE');
    localStorage.setItem('examhub_auth_mode', 'DEMO_MODE');
    setUser(DEMO_USERS.GUEST);
    localStorage.setItem('examhub_user_tier', 'GUEST');
    localStorage.setItem('examhub_user_role', 'STUDENT');
  };

  // Explicit Demo Profile Switcher for UI Development & Verification
  const switchDemoProfile = (tier: UserTier, role: Role = 'STUDENT') => {
    let nextUser: User;
    if (role === 'SUPER_ADMIN') {
      nextUser = DEMO_USERS.SUPER_ADMIN;
    } else {
      nextUser = DEMO_USERS[tier] || DEMO_USERS.GUEST;
    }
    setUser(nextUser);
    setAuthMode('DEMO_MODE');
    setIsAuthenticated(false);
    localStorage.setItem('examhub_auth_mode', 'DEMO_MODE');
    localStorage.setItem('examhub_user_tier', nextUser.tier);
    localStorage.setItem('examhub_user_role', nextUser.role);
  };

  const enableDemoMode = (tier: UserTier = 'REGISTERED', role: Role = 'STUDENT') => {
    switchDemoProfile(tier, role);
  };

  const exitDemoMode = () => {
    setUser(DEMO_USERS.GUEST);
    localStorage.setItem('examhub_user_tier', 'GUEST');
    localStorage.setItem('examhub_user_role', 'STUDENT');
  };

  // Resolve clean entitlement abstraction based on real user tier and authentication state
  const entitlement = resolveUserEntitlement(user.tier, isAuthenticated);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        tier: user.tier,
        authMode,
        isAuthenticated,
        emailConfirmed,
        entitlement,
        tenantMembership,
        loginModalOpen,
        setLoginModalOpen,
        signInWithPassword,
        signUpWithPassword,
        resetPassword,
        signOut,
        switchDemoProfile,
        enableDemoMode,
        exitDemoMode,
        switchProfile: switchDemoProfile,
        logout: signOut,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
