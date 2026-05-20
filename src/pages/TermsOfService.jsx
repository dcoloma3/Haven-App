import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'May 14, 2026'
const CONTACT_EMAIL = 'support@haven.care'

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-slate-800 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-10">
          <p className="text-sm text-blue-800">
            <strong>Please read these terms carefully.</strong> By creating an account or using Haven, you agree to be bound by these Terms of Service.
            If you do not agree, do not use the service.
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement between you (the "Customer," "you," or "your") and Haven,
            operated by Dominick Coloma ("Haven," "we," "us," or "our"). These Terms govern your access to and use of the Haven software platform
            and any related services (collectively, the "Service").
          </p>
          <p>
            By registering for an account, clicking "I agree," or otherwise accessing or using the Service, you represent that you have read,
            understood, and agree to be bound by these Terms and our Privacy Policy.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>You may use Haven only if:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>You are at least 18 years of age</li>
            <li>You are legally authorized to operate or manage the facility you are enrolling</li>
            <li>Your use of the Service does not violate any applicable law or regulation</li>
          </ul>
          <p>
            Haven is intended for use by licensed residential care facility operators and their authorized staff. By using Haven,
            you represent that you have the authority to bind your facility to these Terms.
          </p>
        </Section>

        <Section title="3. The Service">
          <p>
            Haven provides a web-based platform for senior living facility management, including resident tracking, medication administration recording,
            staff management, incident reporting, and related operational tools (the "Service").
          </p>
          <p>
            Haven is a software tool to assist with facility operations. It is not a substitute for professional medical judgment, licensed nursing care,
            regulatory compliance consulting, or legal advice. You are solely responsible for ensuring that your use of the Service complies with
            applicable state and federal regulations, including your facility's licensing requirements.
          </p>
        </Section>

        <Section title="4. Your Account">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
            You agree to notify us immediately at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#185FA5] hover:underline">{CONTACT_EMAIL}</a>{' '}
            if you suspect unauthorized access to your account.
          </p>
          <p>
            You are responsible for ensuring that all staff members you add to your account understand and comply with these Terms.
          </p>
        </Section>

        <Section title="5. Subscription and Payment">
          <p>
            Haven is offered on a subscription basis with plans as described on our pricing page. Your subscription renews automatically at the end of each billing period
            unless you cancel before the renewal date.
          </p>
          <p>
            <strong className="text-slate-700">Free trial.</strong> New accounts may begin with a 14-day free trial. No credit card is required to start a trial.
            At the end of the trial period, you must subscribe to continue using the Service.
          </p>
          <p>
            <strong className="text-slate-700">Billing.</strong> Subscription fees are charged in advance for the billing period chosen (monthly or annual).
            All fees are non-refundable except as expressly stated in these Terms or required by law.
          </p>
          <p>
            <strong className="text-slate-700">Cancellation.</strong> You may cancel your subscription at any time. Upon cancellation, your access continues
            until the end of the current billing period. Your data is retained for 90 days after cancellation to allow for reactivation or export.
          </p>
          <p>
            <strong className="text-slate-700">Price changes.</strong> We reserve the right to change subscription prices with at least 30 days' advance notice.
            Price changes will take effect at your next renewal date.
          </p>
        </Section>

        <Section title="6. Your Data">
          <p>
            You retain all ownership rights to the data you enter into Haven, including facility information, resident records, and staff information ("Your Data").
            Haven does not claim ownership of Your Data.
          </p>
          <p>
            You grant Haven a limited, non-exclusive license to use Your Data solely for the purpose of operating, maintaining, and improving the Service,
            and as otherwise described in our Privacy Policy.
          </p>
          <p>
            You are responsible for the accuracy and legality of Your Data. You represent that you have the right to enter the data you provide,
            including any resident health information, and that doing so complies with applicable law.
          </p>
        </Section>

        <Section title="7. Resident Health Information">
          <p>
            You acknowledge that resident health information entered into Haven may be subject to California's Confidentiality of Medical Information Act (CMIA)
            and other applicable privacy laws. You are responsible for using Haven in a manner consistent with your facility's legal obligations
            regarding the protection of resident health information.
          </p>
          <p>
            If your facility qualifies as a HIPAA covered entity or business associate and you require a Business Associate Agreement (BAA),
            please contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#185FA5] hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="8. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
            <li>Enter false, fraudulent, or misleading information</li>
            <li>Attempt to gain unauthorized access to other accounts or Haven's systems</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
            <li>Use the Service to store or transmit malware, viruses, or harmful code</li>
            <li>Resell or sublicense the Service without our express written consent</li>
            <li>Use the Service in a way that could damage, disable, or impair the Service</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <p>
            The Haven platform, including its design, code, features, and branding, is owned by Haven and protected by intellectual property law.
            These Terms do not grant you any rights to Haven's intellectual property except the limited right to use the Service as permitted by these Terms.
          </p>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>
          <p>
            HAVEN DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
          </p>
          <p>
            HAVEN IS NOT A MEDICAL DEVICE AND IS NOT INTENDED TO DIAGNOSE, TREAT, CURE, OR PREVENT ANY DISEASE OR HEALTH CONDITION.
            HAVEN IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT OR LICENSED NURSING CARE.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL HAVEN BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE,
            EVEN IF HAVEN HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            HAVEN'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID
            TO HAVEN IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless Haven and its officers, directors, employees, and agents from and against any claims,
            liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Service;
            (b) Your Data; (c) your violation of these Terms; or (d) your violation of any applicable law or regulation.
          </p>
        </Section>

        <Section title="13. Termination">
          <p>
            You may terminate your account at any time by contacting us or canceling through account settings. We may suspend or terminate your access
            if you violate these Terms, fail to pay subscription fees, or if we discontinue the Service, with reasonable notice where practicable.
          </p>
          <p>
            Upon termination, your right to use the Service ceases immediately. Data retention and deletion follow the terms described in Section 6 and our Privacy Policy.
          </p>
        </Section>

        <Section title="14. Governing Law and Dispute Resolution">
          <p>
            These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions.
            Any dispute arising out of or relating to these Terms or the Service shall be resolved by binding arbitration in accordance
            with the rules of the American Arbitration Association, conducted in Los Angeles County, California,
            except that either party may seek injunctive relief in a court of competent jurisdiction.
          </p>
        </Section>

        <Section title="15. Changes to These Terms">
          <p>
            We may update these Terms from time to time. When we do, we will update the effective date at the top of this page.
            If we make material changes, we will notify you by email or through the Service. Your continued use of the Service after
            the effective date of the updated Terms constitutes your acceptance of the changes.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            If you have questions about these Terms, contact us at:
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
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-slate-600 transition-colors">Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
