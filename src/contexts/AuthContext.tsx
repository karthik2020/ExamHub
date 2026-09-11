import React, { createContext, useContext, useState } from 'react';
import { Role, User, UserTier } from '../types';

interface AuthContextValue {
  user: User;
  role: Role;
  tier: UserTier;
  switchProfile: (tier: UserTier, role?: Role) => void;
  setUser: (user: User) => void;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  logout: () => void;
}

const DEFAULT_USERS: Record<string, User> = {
  GUEST: {
    id: 'u0000000-0000-0000-0000-000000000003',
    email: 'guest@dmathub.com',
    name: 'Guest Candidate',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'GUEST',
  },
  REGISTERED: {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'alexander.weber@tum.de',
    name: 'Alexander Weber',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'REGISTERED',
  },
  PAID: {
    id: 'u0000000-0000-0000-0000-000000000004',
    email: 'sarah.schmidt@lmu.de',
    name: 'Sarah Schmidt (Pro)',
    status: 'ACTIVE',
    role: 'STUDENT',
    tier: 'PAID',
  },
  SUPER_ADMIN: {
    id: 'u0000000-0000-0000-0000-000000000001',
    email: 'admin@dmathub.com',
    name: 'Chief Proctor Admin',
    status: 'ACTIVE',
    role: 'SUPER_ADMIN',
    tier: 'PAID',
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const savedTier = (localStorage.getItem('examhub_user_tier') as UserTier) || 'GUEST';
    const savedRole = (localStorage.getItem('examhub_user_role') as Role) || 'STUDENT';
    if (savedRole === 'SUPER_ADMIN') return DEFAULT_USERS.SUPER_ADMIN;
    return DEFAULT_USERS[savedTier] || DEFAULT_USERS.GUEST;
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const switchProfile = (tier: UserTier, role: Role = 'STUDENT') => {
    let nextUser: User;
    if (role === 'SUPER_ADMIN') {
      nextUser = DEFAULT_USERS.SUPER_ADMIN;
    } else {
      nextUser = DEFAULT_USERS[tier] || DEFAULT_USERS.GUEST;
    }
    setUser(nextUser);
    localStorage.setItem('examhub_user_tier', nextUser.tier);
    localStorage.setItem('examhub_user_role', nextUser.role);
  };

  const logout = () => {
    switchProfile('GUEST', 'STUDENT');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        tier: user.tier,
        switchProfile,
        setUser,
        loginModalOpen,
        setLoginModalOpen,
        logout,
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
