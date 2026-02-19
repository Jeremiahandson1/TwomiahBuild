import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  const effective = 'February 1, 2026';
  const company = 'BuildPro, LLC';
  const email = 'legal@buildpro.app';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: {effective}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using the BuildPro platform ("Service"), you agree to be bound by
              these Terms of Service ("Terms") and our Privacy Policy. If you do not agree, do not use the
              Service. These Terms constitute a binding agreement between you and {company} ("BuildPro",
              "we", "us", or "our").
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              BuildPro is a construction management platform providing CRM, project management, invoicing,
              scheduling, field operations, and related tools for contractors and home service businesses.
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time
              with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration</h2>
            <p>
              You must provide accurate, current, and complete information when registering. You are
              responsible for maintaining the confidentiality of your login credentials and for all activity
              that occurs under your account. You must immediately notify us of any unauthorized access at{' '}
              <a href={`mailto:${email}`} className="text-orange-500 hover:underline">{email}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscription and Billing</h2>
            <p>
              BuildPro offers subscription plans billed monthly or annually. By providing payment information,
              you authorize us to charge your payment method on a recurring basis. Subscriptions automatically
              renew unless cancelled before the renewal date. No refunds are issued for partial billing periods.
              We reserve the right to change pricing with 30 days' notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Free Trial</h2>
            <p>
              New accounts may receive a 14-day free trial. After the trial period, continued use of the
              Service requires a paid subscription. We reserve the right to modify or terminate trial offers
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Data</h2>
            <p>
              You retain ownership of all data you input into BuildPro ("Customer Data"). By using the
              Service, you grant BuildPro a limited license to store, process, and display your Customer Data
              solely to provide the Service. We will not sell your Customer Data to third parties. Upon
              account termination, you may export your data for 30 days before it is deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Transmit spam, malware, or harmful code</li>
              <li>Attempt to gain unauthorized access to any system</li>
              <li>Infringe on any intellectual property rights</li>
              <li>Engage in any activity that disrupts or interferes with the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>
              The BuildPro platform, including its software, design, trademarks, and content, is owned by
              {company} and protected by applicable intellectual property laws. You may not copy, modify,
              distribute, or create derivative works without our express written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT
              WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR MEET YOUR SPECIFIC
              REQUIREMENTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUILDPRO SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA,
              ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE. OUR TOTAL
              LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>
              Either party may terminate this agreement at any time. We may suspend or terminate your
              account immediately for violation of these Terms. Upon termination, your right to use the
              Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Wisconsin, without regard to conflict of
              law principles. Any disputes shall be resolved in the state or federal courts located in Eau
              Claire County, Wisconsin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes via email
              or an in-app notice. Continued use of the Service after changes take effect constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href={`mailto:${email}`} className="text-orange-500 hover:underline">{email}</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
