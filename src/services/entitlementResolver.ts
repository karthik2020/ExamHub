import { PracticeTest, Role, UserTier } from '../types';
import { ENTITLEMENT_DEFINITIONS, UserEntitlements, resolveUserEntitlement } from '../types/entitlements';

export type FeatureKey =
  | 'PRACTICE_BASIC'
  | 'PRACTICE_UNLIMITED'
  | 'PROCEDURAL_GENERATOR'
  | 'MOCK_TESTS'
  | 'DETAILED_EXPLANATIONS'
  | 'PERFORMANCE_ANALYTICS'
  | 'STUDY_PLANNER';

export type TestAccessLevel = 'FREE' | 'REGISTERED' | 'PAID';

export interface UserAuthContext {
  tier: UserTier;
  role?: Role;
  isAuthenticated?: boolean;
}

export interface AccessEvaluation {
  allowed: boolean;
  requiredTier: TestAccessLevel;
  reason?: string;
  code?: 'UPGRADE_REQUIRED' | 'REGISTRATION_REQUIRED';
}

export type TestDisplayStatus = 'AVAILABLE' | 'COMPLETED' | 'LOCKED_UPGRADE' | 'LOCKED_REGISTRATION';

/**
 * Generic Entitlement Resolver
 * Evaluates feature and practice/mock test access without tying rules to any specific tenant or exam.
 * Hierarchy: Tenant -> Exam -> Plan / Subscription -> User Entitlement -> Feature Access.
 */
export const entitlementResolver = {
  /**
   * Determine the access level required for a given practice test or mock examination.
   */
  getTestAccessRequirement(test: PracticeTest): TestAccessLevel {
    // Procedural generation requires PAID / Pro tier
    if (test.question_selection_mode === 'GENERATED') {
      return 'PAID';
    }

    // Full timed mock exams require REGISTERED or PAID tier
    if (test.test_type === 'MOCK') {
      if (test.time_limit_minutes && test.time_limit_minutes >= 45) {
        return 'PAID';
      }
      return 'REGISTERED';
    }

    // Explicit name/description conventions
    const nameLower = test.name.toLowerCase();
    const descLower = (test.description || '').toLowerCase();
    if (nameLower.includes('pro') || descLower.includes('pro member') || descLower.includes('premium')) {
      return 'PAID';
    }

    // Fixed diagnostic tests are available to all candidates (Free)
    if (test.test_type === 'DIAGNOSTIC' || (test.question_count && test.question_count <= 10)) {
      return 'FREE';
    }

    // Extended question pools (e.g. >10 questions) require at least free registration
    return 'REGISTERED';
  },

  /**
   * Evaluate whether a user has permission to access a specific feature.
   */
  canAccessFeature(
    userContext: UserAuthContext,
    feature: FeatureKey
  ): { allowed: boolean; reason?: string; code?: 'UPGRADE_REQUIRED' | 'REGISTRATION_REQUIRED' } {
    // Super admins and tenant admins have unrestricted feature access
    if (userContext.role === 'SUPER_ADMIN' || userContext.role === 'TENANT_ADMIN') {
      return { allowed: true };
    }

    const entitlement: UserEntitlements = resolveUserEntitlement(
      userContext.tier,
      Boolean(userContext.isAuthenticated)
    );

    switch (feature) {
      case 'PRACTICE_BASIC':
        return { allowed: true };

      case 'PRACTICE_UNLIMITED':
        if (entitlement.level === 'PREMIUM') {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Unlimited question sessions require a Pro Membership.',
          code: 'UPGRADE_REQUIRED',
        };

      case 'PROCEDURAL_GENERATOR':
        if (entitlement.hasProceduralGeneratorAccess) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Live procedural question generation requires an active Pro Membership.',
          code: 'UPGRADE_REQUIRED',
        };

      case 'MOCK_TESTS':
        if (entitlement.hasTimedMockExamAccess) {
          return { allowed: true };
        }
        if (!userContext.isAuthenticated) {
          return {
            allowed: false,
            reason: 'Timed mock examinations require candidate account registration.',
            code: 'REGISTRATION_REQUIRED',
          };
        }
        return {
          allowed: false,
          reason: 'Full timed mock examinations require an upgraded plan.',
          code: 'UPGRADE_REQUIRED',
        };

      case 'DETAILED_EXPLANATIONS':
        if (entitlement.hasDetailedStepExplanations) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Detailed step-by-step solutions require candidate registration.',
          code: 'REGISTRATION_REQUIRED',
        };

      case 'PERFORMANCE_ANALYTICS':
        if (entitlement.hasPerformanceAnalytics) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Historical analytics and section breakdowns require candidate registration.',
          code: 'REGISTRATION_REQUIRED',
        };

      case 'STUDY_PLANNER':
        return { allowed: true };

      default:
        return { allowed: true };
    }
  },

  /**
   * Evaluate whether a user has permission to start a specific practice or mock test.
   */
  canAccessTest(userContext: UserAuthContext, test: PracticeTest): AccessEvaluation {
    // Super admins and tenant admins have unrestricted test access
    if (userContext.role === 'SUPER_ADMIN' || userContext.role === 'TENANT_ADMIN') {
      return { allowed: true, requiredTier: 'FREE' };
    }

    const requiredTier = this.getTestAccessRequirement(test);
    const isAuthenticated = Boolean(userContext.isAuthenticated);
    const isPro = userContext.tier === 'PAID';

    if (requiredTier === 'FREE') {
      return { allowed: true, requiredTier: 'FREE' };
    }

    if (requiredTier === 'REGISTERED') {
      if (isAuthenticated || userContext.tier === 'REGISTERED' || isPro) {
        return { allowed: true, requiredTier: 'REGISTERED' };
      }
      return {
        allowed: false,
        requiredTier: 'REGISTERED',
        reason: 'This practice module requires a candidate account. Sign in or register to begin.',
        code: 'REGISTRATION_REQUIRED',
      };
    }

    if (requiredTier === 'PAID') {
      if (isPro) {
        return { allowed: true, requiredTier: 'PAID' };
      }
      return {
        allowed: false,
        requiredTier: 'PAID',
        reason:
          test.question_selection_mode === 'GENERATED'
            ? 'Procedural algorithmic generation requires a Pro Candidate Membership.'
            : 'Full mock examinations require an upgraded Pro Candidate Membership.',
        code: 'UPGRADE_REQUIRED',
      };
    }

    return { allowed: true, requiredTier: 'FREE' };
  },

  /**
   * Get the display status for a test card in the UI.
   */
  getTestDisplayStatus(
    userContext: UserAuthContext,
    test: PracticeTest,
    hasCompleted = false
  ): TestDisplayStatus {
    if (hasCompleted) {
      return 'COMPLETED';
    }

    const evaluation = this.canAccessTest(userContext, test);
    if (evaluation.allowed) {
      return 'AVAILABLE';
    }

    if (evaluation.code === 'REGISTRATION_REQUIRED') {
      return 'LOCKED_REGISTRATION';
    }

    return 'LOCKED_UPGRADE';
  },
};
