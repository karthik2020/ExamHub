import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { SEOHead } from '../../components/common/SEOHead';
import { apiFetch } from '../../services/apiClient';

export const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const { studentPortalPath } = useTenant();
  const { user, tier, entitlement, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'pending' | 'active' | 'failed'>('pending');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  // Authoritative server state query: never trust client-side parameters for entitlement!
  const checkAuthoritativeStatus = async () => {
    try {
      const data = await apiFetch<any>('/api/subscriptions/current');
      setSubscriptionData(data);

      if (data.tier === 'PAID' && data.subscription?.status === 'ACTIVE') {
        setServerStatus('active');
        setLoading(false);
      } else {
        // If not yet active, poll up to 5 times (10 seconds total) for asynchronous webhook / verification confirmation
        if (pollCount < 5) {
          setTimeout(() => {
            setPollCount((prev) => prev + 1);
          }, 2000);
        } else {
          setServerStatus('pending');
          setLoading(false);
        }
      }
    } catch {
      setServerStatus('failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthoritativeStatus();
  }, [pollCount]);

  const targetDashboard = studentPortalPath || '/ems';

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
      <SEOHead
        title="Payment Status — dMATHub Examination Access Pass"
        description="Authoritative status of your dMATHub examination access pass."
        canonical="https://dmathub.com/ems/checkout/success"
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center space-y-8">
        {loading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center animate-spin">
              <RefreshCw className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Verifying Payment Confirmation...</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Querying authoritative database for confirmed payment record. The browser redirect is non-authoritative;
              your access pass will be activated upon server verification.
            </p>
          </div>
        ) : serverStatus === 'active' ? (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Authoritative Server Entitlement Verified
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                90-Day Examination Access Pass Activated
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Welcome to PRO! Your access pass has been authoritatively verified by the server. You now have full
                unlimited access to algorithmic procedural generation, custom session variations, and 90-minute timed
                mock examinations.
              </p>
            </div>

            {subscriptionData?.subscription && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Plan:</span>
                  <span className="font-bold text-slate-900">
                    {subscriptionData.subscription.plans?.name || 'dMAT 90-Day Pass'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Status:</span>
                  <span className="font-bold text-emerald-700 uppercase">ACTIVE</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Expires:</span>
                  <span className="font-bold text-slate-900">
                    {subscriptionData.subscription.expires_at
                      ? new Date(subscriptionData.subscription.expires_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '90 days from activation'}
                  </span>
                </div>
                {paymentId && (
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 mt-2">
                    <span className="font-medium">Payment ID:</span>
                    <span className="font-mono text-[11px] text-slate-700">{paymentId}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`${targetDashboard}/mock-tests`}
                className="px-6 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span>Launch Timed Mock Exam</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={targetDashboard}
                className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center transition-colors"
              >
                Go to Student Dashboard
              </Link>
            </div>
          </div>
        ) : serverStatus === 'pending' ? (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                Payment Verification Pending
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payment Confirmation in Progress</h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Your payment was received by the gateway and is undergoing authoritative server-side signature and
                webhook verification. Please refresh shortly or check your student dashboard.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setPollCount(0);
                  checkAuthoritativeStatus();
                }}
                className="px-6 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </button>
              <Link
                to={targetDashboard}
                className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-rose-600" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                Entitlement Unverified
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Access Pass Not Active</h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                The authoritative server could not confirm a completed payment for this session. Client-side browser
                redirects are non-authoritative and do not grant access. If you completed a payment, please allow a
                moment for webhook confirmation or contact support.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/pricing"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center transition-colors"
              >
                Return to Pricing
              </Link>
              <Link
                to={targetDashboard}
                className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
