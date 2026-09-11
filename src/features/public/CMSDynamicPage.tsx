import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Check, HelpCircle, ShieldCheck } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { tenantService } from '../../services/tenantService';
import { CMSPage, Plan } from '../../types';

interface CMSDynamicPageProps {
  forcedSlug?: string;
}

export const CMSDynamicPage: React.FC<CMSDynamicPageProps> = ({ forcedSlug }) => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const pageSlug = forcedSlug || paramSlug || 'about';
  const { currentTenant, studentPortalPath } = useTenant();

  const [page, setPage] = useState<CMSPage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([tenantService.getPage(pageSlug), tenantService.getPlans()])
      .then(([pageData, planList]) => {
        if (isMounted) {
          setPage(pageData);
          setPlans(planList);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Page not found');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pageSlug, currentTenant?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">Loading page content...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-600 mb-6">The requested page "{pageSlug}" could not be located for this tenant.</p>
        <Link to="/" className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
          {currentTenant?.name} • CMS Page
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{page.title}</h1>
        {page.meta_description && (
          <p className="text-slate-600 mt-2 text-base leading-relaxed">{page.meta_description}</p>
        )}
      </div>

      {/* Main Content Render */}
      <div className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed space-y-4 whitespace-pre-line bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        {page.content}
      </div>

      {/* Special Pricing Tier Card Renderer if on /pricing */}
      {pageSlug === 'pricing' && plans.length > 0 && (
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Membership Tiers & Entitlements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isPro = p.price > 0;
              return (
                <div
                  key={p.id}
                  className={`p-6 rounded-2xl border flex flex-col justify-between ${
                    isPro ? 'border-teal-600 bg-teal-50/30 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.name}</span>
                    <div className="mt-2 mb-3">
                      <span className="text-3xl font-black text-slate-900">
                        {p.price === 0 ? 'Free' : `€${p.price}`}
                      </span>
                      {p.price > 0 && <span className="text-xs text-slate-500 font-medium"> / {p.billing_interval.toLowerCase()}</span>}
                    </div>
                    <p className="text-xs text-slate-600 mb-4">{p.description}</p>
                    <ul className="space-y-2 text-xs text-slate-600 mb-6">
                      {p.features?.map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={`${studentPortalPath}/practice`}
                    className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition-colors ${
                      isPro ? 'bg-teal-700 text-white hover:bg-teal-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {isPro ? 'Upgrade to Pro' : 'Start Free'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer link to practice */}
      <div className="mt-8 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <span className="text-slate-600">Want to test questions directly in the engine?</span>
        <Link
          to={`${studentPortalPath}/practice`}
          className="font-bold text-teal-700 hover:text-teal-800 hover:underline"
        >
          Open Practice Drills →
        </Link>
      </div>
    </div>
  );
};
