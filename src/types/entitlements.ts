import { UserTier } from './index';

export type EntitlementLevel = 'FREE' | 'REGISTERED' | 'PREMIUM';

export interface UserEntitlements {
  level: EntitlementLevel;
  displayName: string;
  badgeColor: string;
  // Functional entitlements
  maxQuestionsPerSession: number;
  fixedQuestionsPoolLimit: number;
  hasProceduralGeneratorAccess: boolean;
  hasDetailedStepExplanations: boolean;
  hasTimedMockExamAccess: boolean;
  hasPerformanceAnalytics: boolean;
  hasStudyPlanCustomization: boolean;
  requiresPaymentUpgrade: boolean;
  source: 'UNAUTHENTICATED' | 'REGISTERED_MEMBER' | 'SUBSCRIPTION';
}

export const ENTITLEMENT_DEFINITIONS: Record<EntitlementLevel, UserEntitlements> = {
  FREE: {
    level: 'FREE',
    displayName: 'Guest Evaluation',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    maxQuestionsPerSession: 10,
    fixedQuestionsPoolLimit: 10,
    hasProceduralGeneratorAccess: false,
    hasDetailedStepExplanations: false,
    hasTimedMockExamAccess: false,
    hasPerformanceAnalytics: false,
    hasStudyPlanCustomization: false,
    requiresPaymentUpgrade: true,
    source: 'UNAUTHENTICATED',
  },
  REGISTERED: {
    level: 'REGISTERED',
    displayName: 'Registered Candidate',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    maxQuestionsPerSession: 20,
    fixedQuestionsPoolLimit: 20,
    hasProceduralGeneratorAccess: false,
    hasDetailedStepExplanations: true,
    hasTimedMockExamAccess: true,
    hasPerformanceAnalytics: true,
    hasStudyPlanCustomization: true,
    requiresPaymentUpgrade: true,
    source: 'REGISTERED_MEMBER',
  },
  PREMIUM: {
    level: 'PREMIUM',
    displayName: 'Pro Candidate',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    maxQuestionsPerSession: 50,
    fixedQuestionsPoolLimit: 1000,
    hasProceduralGeneratorAccess: true,
    hasDetailedStepExplanations: true,
    hasTimedMockExamAccess: true,
    hasPerformanceAnalytics: true,
    hasStudyPlanCustomization: true,
    requiresPaymentUpgrade: false,
    source: 'SUBSCRIPTION',
  },
};

/**
 * Resolve entitlement configuration from user tier and auth state.
 * Real registered users always have at least REGISTERED level.
 */
export function resolveUserEntitlement(
  tier: UserTier,
  isAuthenticated: boolean
): UserEntitlements {
  if (!isAuthenticated && tier === 'GUEST') {
    return ENTITLEMENT_DEFINITIONS.FREE;
  }
  if (tier === 'PAID') {
    return ENTITLEMENT_DEFINITIONS.PREMIUM;
  }
  return ENTITLEMENT_DEFINITIONS.REGISTERED;
}
