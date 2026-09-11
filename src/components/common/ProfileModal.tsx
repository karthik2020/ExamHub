import React from 'react';
import { Check, ShieldAlert, Sparkles, UserCheck, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Role, UserTier } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, role, tier, switchProfile } = useAuth();

  if (!isOpen) return null;

  const profiles: {
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
        'No account creation required',
        'Difficulty selector filters existing fixed pool',
        'Session refresh retains fixed items',
      ],
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    {
      tier: 'REGISTERED',
      role: 'STUDENT',
      title: 'Registered Member',
      description: 'Logged-in verified applicant with access to expanded verified bank.',
      features: [
        '20 fixed questions pool (first 10 + extra 10)',
        'Personal attempt history tracking',
        'Topic accuracy diagnostics',
        'Detailed step explanations',
      ],
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    {
      tier: 'PAID',
      role: 'STUDENT',
      title: 'Pro Unlimited Member',
      description: 'Premium candidate utilizing the procedural figure sequence engine.',
      features: [
        'Unlimited procedurally generated figure sequences',
        'On-demand difficulty level (Easy/Medium/Hard)',
        'Custom test length configuration',
        'Full 90-minute timed mock simulation',
      ],
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      tier: 'PAID',
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      description: 'Platform proctor and tenant operations manager.',
      features: [
        'Tenant Branding configuration (Colors, Logo, Portal Path)',
        'Question Bank authoring & live preview',
        'Deterministic Generator Workbench & 10-point validator',
        'Audit trails & User RBAC management',
      ],
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Switch Test Profile & Access Tier</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current User: <span className="font-semibold text-slate-700">{user.name}</span> ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-5">
          {profiles.map((p, idx) => {
            const isCurrent =
              p.role === 'SUPER_ADMIN'
                ? role === 'SUPER_ADMIN'
                : tier === p.tier && role === 'STUDENT';

            return (
              <div
                key={idx}
                onClick={() => {
                  switchProfile(p.tier, p.role);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${p.badgeColor}`}>
                        {p.tier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{p.description}</p>
                  <ul className="space-y-1 text-[11px] text-slate-500">
                    {p.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isCurrent ? 'Current Profile' : 'Switch to this Profile'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p>
            <strong>Note on Access Architecture:</strong> This switcher allows instant verification of the 3-tier access model (Guest: 10 fixed, Registered: 20 fixed, Pro: Unlimited generated questions) without needing real payment gateway execution in this prototype.
          </p>
        </div>
      </div>
    </div>
  );
};
