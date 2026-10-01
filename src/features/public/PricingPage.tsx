import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, ShieldCheck, Sparkles, CreditCard, Loader2 } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plan } from '../../types';
import { apiFetch } from '../../services/apiClient';

const PENDING_PLAN_KEY = 'pending_checkout_plan_id';

const DEFAULT_COMMERCIAL_PLAN: Plan = {
  id: 'e1000000-0000-0000-0000-000000000003',
  tenant_id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Pro Unlimited Pass',
  description: '90 days of endless procedural Figure Sequence variations, difficulty controls, and full-length timed mocks.',
  price: 2499,
  currency: 'INR',
  billing_interval: 'ONE_TIME',
  status: 'ACTIVE',
  features: [
    'Unlimited procedural Figure Sequence drills',
    'Custom difficulty controls: Easy, Medium, Hard',
    'Full 90-minute timed mock test simulation',
    'Infinite reproducible seeds & review replay',
    'Authoritative 90-day access window',
  ],
};

export const PricingPage: React.FC = () => {
  const { studentPortalPath } = useTenant();
  const { setLoginModalOpen, isAuthenticated, entitlement, user, authMode, loginModalOpen } = useAuth();
  const navigate = useNavigate();

  const [commercialPlan, setCommercialPlan] = useState<Plan>(DEFAULT_COMMERCIAL_PLAN);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [pendingPlanId, setPendingPlanId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_PLAN_KEY) : null;
  });

  const isCheckoutInFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      try {
        const res = await fetch('/api/plans');
        if (res.ok && isMounted) {
          const plans: Plan[] = await res.json();
          // Find the active commercial upgrade plan
          const pro = plans.find((p) => p.price > 0 && p.status === 'ACTIVE') || plans[plans.length - 1];
          if (pro) {
            setCommercialPlan(pro);
          }
        }
      } catch (err) {
        // Fall back gracefully to authoritative default commercial plan without breaking the page
        console.warn('Using default commercial plan configuration:', err);
      } finally {
        if (isMounted) {
          setLoadingPlan(false);
        }
      }
    }
    loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatPrice = (price: number, currency: string) => {
    if (currency.toUpperCase() === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    if (currency.toUpperCase() === 'EUR') {
      return `€${price.toLocaleString()}`;
    }
    if (currency.toUpperCase() === 'USD') {
      return `$${price.toLocaleString()}`;
    }
    return `${currency} ${price}`;
  };

  const planPriceDisplay = '₹2,499';
  const planIntervalDisplay = 'One-time payment • 90 days full examination access';

  const comparisonFeatures = [
    { name: '10-Question Diagnostic Test', guest: true, registered: true, pro: true },
    { name: 'Instant Server-Side Scoring', guest: true, registered: true, pro: true },
    { name: 'Full Fixed Curriculum Question Bank', guest: false, registered: true, pro: true },
    { name: 'Step-by-Step SVG Graphical Solutions', guest: false, registered: true, pro: true },
    { name: 'Persistent Attempt History & Review', guest: false, registered: true, pro: true },
    { name: 'Empirical Readiness Index (0–100)', guest: false, registered: true, pro: true },
    { name: 'Sectional Study Recommendations', guest: false, registered: true, pro: true },
    { name: 'Algorithmic Procedural Figure Sequence Generator', guest: false, registered: false, pro: true },
    { name: 'Infinite Reproducible Variations with Seed Replay', guest: false, registered: false, pro: true },
    { name: 'Configurable Generator Difficulty (Easy, Medium, Hard)', guest: false, registered: false, pro: true },
    { name: 'Full-Length 90-Minute Timed Simulation Mocks', guest: false, registered: false, pro: true },
  ];

  // Dynamically load Razorpay standard checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const executeCheckout = async (targetPlanId: string) => {
    if (isCheckoutInFlight.current) return;

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PENDING_PLAN_KEY, targetPlanId);
      }
      setPendingPlanId(targetPlanId);

      if (authMode === 'DEMO_MODE') {
        setCheckoutError(
          'Developer Demo Mode is active. Demo profiles cannot process real transactions. Please sign in with Production Auth (Supabase) to complete checkout.'
        );
      }
      setLoginModalOpen(true);
      return;
    }

    if (entitlement.level === 'PREMIUM') {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(PENDING_PLAN_KEY);
      }
      setPendingPlanId(null);
      navigate(`${studentPortalPath || '/ems'}/mock-tests`);
      return;
    }

    // Authenticated via Supabase: clear pending plan safely before initiating to avoid duplicate runs
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PENDING_PLAN_KEY);
    }
    setPendingPlanId(null);

    isCheckoutInFlight.current = true;
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const session = await apiFetch<any>('/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify({ plan_id: targetPlanId }),
      });

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error('Could not load Razorpay payment gateway. Please check network connectivity.');
      }

      const options = {
        key: session.key_id,
        amount: session.amount,
        currency: session.currency,
        name: 'dMATHub',
        description: `${session.plan?.name || 'dMAT'} 90-Day Examination Access Pass`,
        order_id: session.order_id,
        handler: async function (response: any) {
          try {
            setCheckoutLoading(true);
            setCheckoutError(null);
            // Forward returned identifiers to server for authoritative verification
            await apiFetch('/api/checkout/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            // Only after backend verification succeeds redirect to /ems/checkout/success
            navigate(
              `/ems/checkout/success?order_id=${encodeURIComponent(response.razorpay_order_id)}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}`
            );
          } catch (e: any) {
            console.error('Server verification submission error:', e);
            setCheckoutError(e.message || 'Payment verification failed on the server. Please contact support.');
          } finally {
            setCheckoutLoading(false);
            isCheckoutInFlight.current = false;
          }
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
            isCheckoutInFlight.current = false;
          },
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#0f766e',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setCheckoutError(`Payment failed: ${resp.error?.description || 'Transaction was declined.'}`);
        setCheckoutLoading(false);
        isCheckoutInFlight.current = false;
      });
      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Payment initiation failed. Please try again.');
      setCheckoutLoading(false);
      isCheckoutInFlight.current = false;
    }
  };

  const handleCheckout = () => {
    const planId = commercialPlan?.id || 'e1000000-0000-0000-0000-000000000003';
    executeCheckout(planId);
  };

  // Automatically resume pending checkout once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const storedPlanId = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_PLAN_KEY) : null;
      const planToResume = storedPlanId || pendingPlanId;
      if (planToResume && !checkoutLoading && !isCheckoutInFlight.current) {
        executeCheckout(planToResume);
      }
    }
  }, [isAuthenticated]);

  // Clean up pending plan ID if modal is closed without authenticating
  useEffect(() => {
    if (!loginModalOpen && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(PENDING_PLAN_KEY);
      }
      setPendingPlanId(null);
    }
  }, [loginModalOpen, isAuthenticated]);

  return (
    <div className="space-y-20 py-10 sm:py-16">
      <SEOHead
        title="dMATHub Pricing & Access Tiers — Transparent Preparation Plans"
        description="Choose your dMAT preparation tier: Free Guest diagnostic, Registered Member question bank access, or PRO 90-Day Examination Access Pass with Unlimited Procedural Generator."
        canonical="https://dmathub.com/pricing"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5 text-teal-700" />
            <span>Honest, Transparent Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Simple, Transparent Preparation Plans
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Begin as a Free Guest without creating an account. Register for the full verified curriculum bank,
            or upgrade to PRO for 90 days of unlimited procedural matrix generation and full-length exam simulations.
          </p>

          {checkoutError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium max-w-md mx-auto space-y-2 text-left">
              <p>{checkoutError}</p>
              {authMode === 'DEMO_MODE' && !isAuthenticated && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-teal-800 text-white font-bold text-xs hover:bg-teal-900 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Sign In with Production Auth</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3 Tier Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: Free Guest */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tier 1</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Free Guest</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Evaluate question format, interface timing, and difficulty without an account.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-4xl font-black text-slate-900">Free</div>
                <div className="text-xs text-slate-500">No account or credit card needed</div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>10-Question Diagnostic Assessment</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Real-time countdown timer & navigation</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Instant server-side score calculation</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Saved history & attempt persistence</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Step-by-step SVG graphical solutions</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Procedural question generator</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100">
              <Link
                to={`${studentPortalPath || '/ems'}/practice`}
                className="w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center block transition-colors"
              >
                Start Diagnostic as Guest
              </Link>
            </div>
          </div>

          {/* Card 2: Registered Member */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Tier 2</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Registered Member</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Full verified fixed question bank, persistent attempt analytics, and graphical solutions.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-4xl font-black text-slate-900">Free</div>
                <div className="text-xs text-slate-500">Free forever with email account</div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Full fixed verified question bank access</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Detailed step-by-step SVG solutions</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Attempt history & progress dashboard</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Readiness Index (0–100) vs 65% target</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Personalized sectional study guidance</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>Procedural question generator</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center block transition-colors cursor-pointer"
              >
                Create Free Account
              </button>
            </div>
          </div>

          {/* Card 3: Pro Unlimited Generator */}
          <div className="p-7 sm:p-8 rounded-3xl bg-teal-900 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Tier 3</span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  90-Day Full Access
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Pro Unlimited Pass</h3>
                <p className="text-xs text-teal-200 mt-1.5 leading-relaxed">
                  90 days of endless procedural Figure Sequence variations, difficulty controls, and full-length timed mocks.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-4xl font-black text-white">
                  {loadingPlan ? '...' : planPriceDisplay}
                  <span className="text-xs font-medium text-teal-300 block mt-1">
                    {planIntervalDisplay}
                  </span>
                </div>
                <div className="text-xs text-teal-300">One-time purchase • No auto-renewal</div>
              </div>

              <div className="pt-4 border-t border-teal-800 space-y-3 text-xs text-teal-100">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Unlimited procedural Figure Sequence generation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Custom difficulty modes: Easy, Medium, Hard</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Infinite reproducible seeds & review replay</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Full-length 90-minute timed simulation mocks</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Advanced candidate readiness trajectory</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>90-day authoritative access window</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-teal-800">
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-xl bg-white text-teal-950 hover:bg-teal-50 font-bold text-xs text-center flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-75"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-900" />
                    <span>Preparing Checkout...</span>
                  </>
                ) : isAuthenticated && entitlement.level === 'PREMIUM' ? (
                  'Current Plan: PRO (Active Pass)'
                ) : (
                  'Get 90-Day Access — ₹2,499'
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Comparison Matrix */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Detailed Feature Comparison</h2>
          <p className="text-xs sm:text-sm text-slate-600">Review exact functional entitlements across each tier.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 sm:p-5 font-bold text-slate-900 text-sm">Capability / Feature</th>
                  <th className="p-4 sm:p-5 font-bold text-slate-900 text-center w-36">Free Guest</th>
                  <th className="p-4 sm:p-5 font-bold text-teal-900 text-center w-40 bg-teal-50/50">
                    Registered (Free)
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-slate-900 text-center w-40">
                    PRO ({planPriceDisplay})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonFeatures.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 sm:p-5 font-medium text-slate-800">{f.name}</td>
                    <td className="p-4 sm:p-5 text-center">
                      {f.guest ? (
                        <Check className="w-4 h-4 text-teal-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-center bg-teal-50/30">
                      {f.registered ? (
                        <Check className="w-4 h-4 text-teal-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      {f.pro ? (
                        <Check className="w-4 h-4 text-teal-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Gateway & Readiness Disclosure */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Commercial Infrastructure & Billing Policy</span>
          </div>
          <p className="leading-relaxed">
            dMATHub utilizes a multi-tenant entitlement architecture backed by authoritative database verification.
            Examination Access Passes are one-time commercial purchases with a 90-day validity window and no recurring
            auto-renewal. Commercial payments are processed through Razorpay Test Mode with backend-authoritative signature
            verification.
          </p>
        </div>
      </section>
    </div>
  );
};
