import React, { useState } from 'react';
import { Mail, MessageSquare, ShieldCheck, CheckCircle2, Clock, Send } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Preparation Query');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 py-10 sm:py-16">
      <SEOHead
        title="Contact dMATHub — Candidate Support & Inquiries"
        description="Get in touch with the dMATHub academic support team for technical assistance, curriculum questions, or institutional inquiries."
        canonical="https://dmathub.com/contact"
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5 text-teal-700" />
            <span>Candidate Support & Inquiries</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            We Are Here to Assist Your Preparation
          </h1>

          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Have questions about question formats, technical access, or platform features? Reach out to our team.
          </p>
        </div>
      </section>

      {/* Content Form & Cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left info cards */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Direct Channels</h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Candidate Inquiries</div>
                    <div className="text-slate-500">support@dmathub.com</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Response Window</div>
                    <div className="text-slate-500">Within 1 business day (Mon–Fri)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Data Privacy</div>
                    <div className="text-slate-500">Candidate data is never sold or shared.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-3 text-xs">
              <h4 className="font-bold text-sm text-teal-300">Quick Resource Links</h4>
              <p className="text-slate-300 leading-relaxed">
                Before sending an inquiry, check our knowledge base for answers regarding question types and access tiers.
              </p>
              <div className="pt-1">
                <a href="/faq" className="text-teal-400 font-bold hover:underline">
                  Visit Frequently Asked Questions →
                </a>
              </div>
            </div>
          </div>

          {/* Right form */}
          <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Received</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Thank you for reaching out. An academic support coordinator will review your inquiry and reply to{' '}
                  <strong className="text-slate-800">{email}</strong> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">Submit an Inquiry</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Candidate Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Subject Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none bg-white"
                  >
                    <option value="Preparation Query">Preparation & Curriculum Inquiry</option>
                    <option value="Technical Issue">Technical / Platform Issue</option>
                    <option value="Billing & Plans">Access Tiers & Pricing Inquiry</option>
                    <option value="Institutional">Institutional & Faculty Collaboration</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Inquiry Details</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or technical inquiry in detail..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
