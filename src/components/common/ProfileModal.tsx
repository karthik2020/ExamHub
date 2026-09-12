import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ShieldAlert,
  UserCheck,
  X,
  LogIn,
  UserPlus,
  LogOut,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Role, UserTier } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    role,
    tier,
    authMode,
    isAuthenticated,
    emailConfirmed,
    entitlement,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
    switchDemoProfile,
  } = useAuth();

  const { studentPortalPath } = useTenant();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'auth' | 'demo'>('auth');
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authView === 'login') {
        const res = await signInWithPassword(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Authentication failed. Please verify your credentials.');
        } else {
          setSuccessMsg('Successfully signed in! Accessing student portal...');
          const targetPath = res.studentPath || studentPortalPath || '/ems';
          setTimeout(() => {
            onClose();
            navigate(targetPath);
          }, 800);
        }
      } else if (authView === 'signup') {
        const res = await signUpWithPassword(email, password, name || email.split('@')[0]);
        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed. Please try again.');
        } else {
          setSuccessMsg(res.message || 'Registration completed successfully!');
          const targetPath = res.studentPath || studentPortalPath || '/ems';
          setTimeout(() => {
            onClose();
            navigate(targetPath);
          }, 1200);
        }
      } else if (authView === 'forgot') {
        const res = await resetPassword(email);
        if (!res.success) {
          setErrorMsg(res.error || 'Password reset request failed.');
        } else {
          setSuccessMsg(res.message || 'Password reset instructions dispatched.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
    onClose();
    navigate('/');
  };

  const demoProfiles: {
    tier: UserTier;
    role: Role;
    title: string;
    description: string;
    features: string[];
    badgeColor: string;
  }[] = [
    {
      tier: 'GUEST',
      role: 'STUDENT',
      title: 'Guest Candidate',
      description: 'Standard guest evaluation mode as mandated by dMATHub rules.',
      features: [
        '10 fixed questions maximum',
        'No registration required',
        'Basic score & accuracy summary',
      ],
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    {
      tier: 'REGISTERED',
      role: 'STUDENT',
      title: 'Registered Member',
      description: 'Logged-in applicant with persistent history and expanded questions pool.',
      features: [
        '20 fixed questions pool',
        'PostgreSQL attempt persistence',
        'Topic diagnostics & step explanations',
      ],
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    {
      tier: 'PAID',
      role: 'STUDENT',
      title: 'Pro Candidate',
      description: 'Candidate testing with procedural figure sequence generation.',
      features: [
        'Unlimited figure sequence questions',
        'Procedural test generation',
        '90-minute timed mock tests',
      ],
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      tier: 'PAID',
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      description: 'Platform proctor and tenant operations manager.',
      features: [
        'Branding & Portal configuration',
        'Question bank editor & generator bench',
        'RBAC management & audit logs',
      ],
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {isAuthenticated ? 'Student Account' : 'Supabase Authentication'}
              </h3>
              <span
                className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isAuthenticated
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isAuthenticated ? 'REAL AUTHENTICATED' : 'DEMO / GUEST MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAuthenticated
                ? `${user.name} (${user.email})`
                : 'Sign in to access your student portal and real attempts.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-100 mt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('auth')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'auth'
                  ? 'border-teal-700 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Production Auth (Supabase)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'border-amber-600 text-amber-800'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Developer Demo Mode</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PRODUCTION SUPABASE AUTH */}
        {activeTab === 'auth' && (
          <div className="py-3">
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{user.name}</h4>
                        <p className="text-xs text-slate-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            Role: {role}
                          </span>
                          <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            Tier: {entitlement.displayName}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              emailConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {emailConfirmed ? 'Verified Email' : 'Email Confirmed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-200/60 text-[11px] text-slate-500 font-mono break-all">
                    Supabase User ID: {user.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">Question Access:</span>
                    <span className="font-semibold text-slate-800">
                      {entitlement.maxQuestionsPerSession} questions / test
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">Data Persistence:</span>
                    <span className="font-semibold text-emerald-700">Real PostgreSQL DB</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(studentPortalPath || '/ems');
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors shadow-xs"
                  >
                    <span>Launch Student Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 border border-rose-200 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Auth Mode Toggle */}
                <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('login');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      authView === 'login'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('signup');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      authView === 'signup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      authView === 'forgot'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reset
                  </button>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Authentication Error:</span> {errorMsg}
                    </div>
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>{successMsg}</div>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-3 max-w-sm mx-auto">
                  {authView === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Candidate Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Marie Curie"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-teal-600"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="candidate@example.com"
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-teal-600"
                      />
                    </div>
                  </div>

                  {authView !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        {authView === 'login' && (
                          <button
                            type="button"
                            onClick={() => setAuthView('forgot')}
                            className="text-[11px] text-teal-700 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-teal-600"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 mt-2 bg-teal-700 text-white font-bold text-xs rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {loading ? (
                      <span>Connecting to Supabase...</span>
                    ) : authView === 'login' ? (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In with Supabase</span>
                      </>
                    ) : authView === 'signup' ? (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Candidate Account</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Dispatch Password Reset</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center pt-1">
                    Powered by Supabase Authentication. Passwords never stored in plaintext.
                  </p>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLICIT DEMO / TESTING PROFILES */}
        {activeTab === 'demo' && (
          <div className="py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-bold">DEVELOPMENT / DEMO MODE:</span> These profiles simulate
                candidate tiers for local inspection and UI evaluation. In production, real user
                entitlements are derived from authenticated Supabase sessions.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {demoProfiles.map((p, idx) => {
                const isCurrent =
                  authMode === 'DEMO_MODE' &&
                  (p.role === 'SUPER_ADMIN'
                    ? role === 'SUPER_ADMIN'
                    : tier === p.tier && role === 'STUDENT');

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      switchDemoProfile(p.tier, p.role);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-900 text-xs">{p.title}</span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${p.badgeColor}`}
                        >
                          {p.tier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                        {p.description}
                      </p>
                      <ul className="space-y-1 text-[10px] text-slate-500">
                        {p.features.map((f, fi) => (
                          <li key={fi} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                          isCurrent
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Active Demo Profile' : 'Select Demo Profile'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
