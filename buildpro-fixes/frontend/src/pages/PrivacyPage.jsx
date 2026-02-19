import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const effective = 'February 1, 2026';
  const company = 'BuildPro, LLC';
  const email = 'privacy@buildpro.app';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: {effective}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
            <p>
              {company} ("BuildPro", "we", "us") operates the BuildPro construction management platform.
              This Privacy Policy explains what information we collect, how we use it, and your rights
              regarding that information. By using the Service, you consent to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p><strong>Account Information:</strong> Name, email address, phone number, company name, and
            billing information provided at signup.</p>
            <p className="mt-3"><strong>Customer Data:</strong> Contacts, jobs, projects, invoices, photos,
            documents, and other business data you input into the platform.</p>
            <p className="mt-3"><strong>Usage Data:</strong> Log data, IP addresses, browser type, pages
            visited, and actions taken within the Service, used to improve reliability and performance.</p>
            <p className="mt-3"><strong>Device Data:</strong> If you use our mobile app, we may collect
            device identifiers, push notification tokens, and location data (only when you grant permission).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process payments and manage your subscription</li>
              <li>Send transactional emails (receipts, password resets, alerts)</li>
              <li>Respond to support requests</li>
              <li>Monitor for fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do not sell your personal information or Customer Data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Sharing of Information</h2>
            <p>
              We share information only with trusted service providers who assist us in operating the Service
              (such as cloud hosting, payment processing, and email delivery). These providers are bound by
              contractual obligations to protect your data. We may also disclose information when required by
              law or to protect the rights and safety of BuildPro, our users, or the public.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. After termination, Customer
              Data is available for export for 30 days and then permanently deleted. Log and usage data may
              be retained for up to 12 months for security and performance analysis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Security</h2>
            <p>
              We use industry-standard security measures including encryption in transit (TLS), encryption
              at rest for sensitive fields, access controls, and regular security reviews. While we take
              reasonable precautions, no system is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies</h2>
            <p>
              We use essential cookies for authentication and security (CSRF protection). We do not use
              advertising or tracking cookies. You may disable cookies in your browser, though this may
              affect certain functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Export your Customer Data at any time</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{' '}
              <a href={`mailto:${email}`} className="text-orange-500 hover:underline">{email}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you believe we have inadvertently collected such
              information, contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes via
              email or an in-app notice at least 30 days before the change takes effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>
              Questions or concerns? Reach us at{' '}
              <a href={`mailto:${email}`} className="text-orange-500 hover:underline">{email}</a> or:
            </p>
            <address className="not-italic mt-3 text-gray-600">
              {company}<br />
              Eau Claire, Wisconsin<br />
              United States
            </address>
          </section>

        </div>
      </div>
    </div>
  );
}
