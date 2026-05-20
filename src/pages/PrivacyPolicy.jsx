import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'May 14, 2026'
const CONTACT_EMAIL = 'support@havencare.app'

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-slate-800 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <svg width="18" height="22" viewBox="0 0 24 30" fill="none" aria-hidden="true">
              <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
              <rect x="4" y="20" width="5" height="8" fill="#185FA5" rx="0.5" />
              <rect x="13" y="18" width="5" height="5" stroke="#185FA5" strokeWidth="1.5" fill="none" rx="0.5" />
              <line x1="12" y1="3" x2="12" y2="6" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="1.5" r="1.5" fill="#378ADD" />
            </svg>
            <span className="text-base font-semibold text-slate-800" style={{ letterSpacing: '-0.3px' }}>haven</span>
          </Link>
          <Link to="/" className="text-sm text-[#185FA5] hover:underline">← Back to home</Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-10">
          <p className="text-sm text-amber-800">
            <strong>Summary:</strong> Haven collects only what's needed to run your facility. We don't sell your data.
            Resident information is encrypted and access-controlled. You own your data and can export or delete it at any time.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            Haven ("we," "us," or "our") is a software-as-a-service platform designed for senior living facility operators.
            Haven is operated by Dominick Coloma. If you have questions about this policy, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#185FA5] hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-slate-700">Account information.</strong> When you create an account, we collect your name, email address, and any profile information you provide.</p>
          <p><strong className="text-slate-700">Facility and resident data.</strong> You may enter information about your facility and the residents in your care, including names, dates of birth, care levels, medication records, vital signs, incident reports, and emergency contact information. You control what is entered.</p>
          <p><strong className="text-slate-700">Staff information.</strong> You may enter staff names, roles, certifications, and scheduling information.</p>
          <p><strong className="text-slate-700">Usage data.</strong> We collect standard server logs including IP addresses, browser type, and pages visited. This data is used to maintain and improve the service.</p>
          <p><strong className="text-slate-700">Payment information.</strong> Billing is handled by third-party payment processors. We do not store credit card numbers on our servers.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Provide, operate, and maintain the Haven platform</li>
            <li>Authenticate users and enforce access controls</li>
            <li>Respond to your support requests</li>
            <li>Send service-related communications (account notices, security alerts)</li>
            <li>Improve and develop the platform</li>
            <li>Comply with applicable legal obligations</li>
          </ul>
          <p>We do not sell, rent, or share your personal information or your residents' information with third parties for their marketing purposes.</p>
        </Section>

        <Section title="4. Resident Health Information">
          <p>
            Haven is used by residential care facilities (RCFEs), adult residential facilities, and similar senior living operators.
            Information entered about residents — including health records, medication histories, and incident reports — is considered
            sensitive personal information under California law, including the Confidentiality of Medical Information Act (CMIA), Cal. Civ. Code § 56 et seq.
          </p>
          <p>
            We treat resident health data with the highest level of care. Access is restricted by role-based permissions that you control.
            Data is encrypted in transit (TLS) and at rest. We do not access resident health data except as necessary to provide technical support
            at your explicit request or to comply with a legal obligation.
          </p>
          <p>
            If your facility is subject to HIPAA as a covered entity or business associate, please contact us to discuss a Business Associate Agreement (BAA).
          </p>
        </Section>

        <Section title="5. Data Storage and Security">
          <p>
            Haven stores data using Supabase, a managed cloud database platform hosted on AWS infrastructure. All data is encrypted in transit using TLS 1.2+
            and encrypted at rest. Access to your data is governed by Row Level Security (RLS) policies — staff only see records belonging to their assigned community.
          </p>
          <p>
            No system is perfectly secure. We implement industry-standard safeguards, but we cannot guarantee absolute security.
            In the event of a data breach that affects your information, we will notify you as required by law.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your account and facility data for as long as your account is active or as needed to provide services.
            If you cancel your subscription, your data is retained for 90 days to allow for reactivation or export.
            After 90 days, inactive accounts and their data are permanently deleted. You may request deletion at any time by contacting us.
          </p>
        </Section>

        <Section title="7. Your Rights (California Residents)">
          <p>If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and other applicable law:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700">Right to know.</strong> You may request information about what personal data we hold about you.</li>
            <li><strong className="text-slate-700">Right to delete.</strong> You may request deletion of your personal data, subject to certain exceptions.</li>
            <li><strong className="text-slate-700">Right to correct.</strong> You may request correction of inaccurate personal data.</li>
            <li><strong className="text-slate-700">Right to opt out.</strong> We do not sell personal data, so there is nothing to opt out of.</li>
            <li><strong className="text-slate-700">Right to non-discrimination.</strong> We will not discriminate against you for exercising your privacy rights.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#185FA5] hover:underline">{CONTACT_EMAIL}</a>.
            We will respond within 45 days.
          </p>
        </Section>

        <Section title="8. Third-Party Services">
          <p>We use the following third-party services to operate Haven:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700">Supabase</strong> — database, authentication, and file storage</li>
            <li><strong className="text-slate-700">Vercel</strong> — web hosting and content delivery</li>
            <li><strong className="text-slate-700">Google</strong> — optional OAuth sign-in (if you choose to sign in with Google)</li>
          </ul>
          <p>Each of these providers has their own privacy policy and security practices. We select providers that meet industry standards for security and data protection.</p>
        </Section>

        <Section title="9. Cookies">
          <p>
            Haven uses session cookies required for authentication. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.
            You can configure your browser to reject cookies, but doing so will prevent you from logging in.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            Haven is designed for use by adults operating senior living facilities. We do not knowingly collect personal information from children under 13.
            If you believe a child has provided personal information to us, contact us immediately.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page.
            If we make material changes, we will notify you by email or via a notice in the application. Your continued use of Haven after
            any changes constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have questions, concerns, or requests related to this Privacy Policy, contact us at:
          </p>
          <div className="bg-slate-100 rounded-xl px-4 py-3 mt-2">
            <p className="font-medium text-slate-700">Haven</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#185FA5] hover:underline">{CONTACT_EMAIL}</a>
          </div>
        </Section>

        {/* Footer nav */}
        <div className="border-t border-slate-200 pt-8 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Haven. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-slate-600 transition-colors">Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
