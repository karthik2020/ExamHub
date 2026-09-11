import React, { useState } from 'react';
import { Check, Palette, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

export const TenantBrandingEditor: React.FC = () => {
  const { currentTenant, updateBranding } = useTenant();

  const [formData, setFormData] = useState({
    name: currentTenant?.name || '',
    domain: currentTenant?.domain || '',
    logo_url: currentTenant?.logo_url || '',
    favicon_url: currentTenant?.favicon_url || '',
    primary_color: currentTenant?.primary_color || '#0f766e',
    secondary_color: currentTenant?.secondary_color || '#0284c7',
    student_path: currentTenant?.student_path || '/ems',
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBranding(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save branding: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-black text-white tracking-tight">Tenant Branding & Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize brand identity, CSS color themes, logo assets, and student portal routes dynamically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Tenant Portal Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Domain Mapping
                </label>
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Student Portal Route Path
                </label>
                <input
                  type="text"
                  name="student_path"
                  value={formData.student_path}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Logo URL (Square PNG or SVG)
              </label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Favicon URL
              </label>
              <input
                type="url"
                name="favicon_url"
                value={formData.favicon_url}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Secondary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-800">
              {saved ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Changes applied dynamically to CSS!
                </span>
              ) : (
                <span className="text-xs text-slate-500">Updates propagate instantly across the platform</span>
              )}

              <button
                type="submit"
                id="btn-save-branding"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Branding Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Live Dynamic Preview
            </h3>

            {/* Mock Header element with chosen colors */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 text-slate-900 space-y-3 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="w-8 h-8 rounded-md object-cover border border-slate-200"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-xs"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    {formData.name.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <div className="font-bold text-xs">{formData.name}</div>
                  <div className="text-[10px] text-slate-400">{formData.domain}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div
                  className="p-3 rounded-lg text-white text-xs font-bold flex items-center justify-between"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  <span>Primary Button / Hero Accent</span>
                  <span className="text-[10px] font-mono opacity-80">{formData.primary_color}</span>
                </div>

                <div
                  className="p-3 rounded-lg text-white text-xs font-bold flex items-center justify-between"
                  style={{ backgroundColor: formData.secondary_color }}
                >
                  <span>Secondary Metric Accent</span>
                  <span className="text-[10px] font-mono opacity-80">{formData.secondary_color}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                Configured Student Portal URL: <code className="text-teal-700">{formData.student_path}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
