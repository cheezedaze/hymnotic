import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | HYMNZ",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-midnight flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <Image
              src="/images/hymnz-logo1.png"
              alt="HYMNZ"
              width={48}
              height={48}
              className="mb-3"
            />
          </Link>
          <h1 className="text-display text-3xl font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Last updated: April 9, 2026
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8 space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              We collect the following types of information when you use the
              HYMNZ service:
            </p>
            <p className="mb-2">
              <strong>Account Information:</strong> When you create an account,
              we collect your name and email address. If you sign in with
              Google or Apple, we receive your name and email from those
              services.
            </p>
            <p className="mb-2">
              <strong>Usage Data:</strong> We collect information about how you
              use the Service, including tracks you listen to, play counts,
              songs you mark as favorites, and your listening preferences.
            </p>
            <p className="mb-2">
              <strong>Device and Technical Data:</strong> We automatically
              collect certain technical information including your IP address,
              browser type, device type, operating system, and general location
              (country/region level).
            </p>
            <p>
              <strong>Payment Data:</strong> Payment information (such as credit
              card details) is collected and processed directly by our payment
              processor, Stripe. We do not store your full payment details on
              our servers. We receive only a reference to your Stripe customer
              account and subscription status.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              2. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Process your subscription and manage your account.</li>
              <li>
                Personalize your experience, such as recommending music based on
                your listening history.
              </li>
              <li>
                Send you service-related communications (account updates,
                security alerts).
              </li>
              <li>
                Send you marketing communications about new music and HYMNZ
                news, only if you have opted in.
              </li>
              <li>
                Detect and prevent fraud, abuse, and security issues.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              3. Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services to operate the HYMNZ
              platform. Each has its own privacy policy governing how they
              handle your data:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Stripe</strong> &mdash; Payment processing and
                subscription management.
              </li>
              <li>
                <strong>Google</strong> &mdash; Authentication (Sign in with
                Google).
              </li>
              <li>
                <strong>Apple</strong> &mdash; Authentication (Sign in with
                Apple).
              </li>
              <li>
                <strong>Amazon Web Services (AWS)</strong> &mdash; Cloud
                hosting, media storage (S3), and content delivery (CloudFront).
              </li>
              <li>
                <strong>Resend</strong> &mdash; Email delivery for account
                notifications and newsletters.
              </li>
              <li>
                <strong>Vercel</strong> &mdash; Web application hosting.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              4. Cookies and Local Storage
            </h2>
            <p>
              We use cookies and local storage to maintain your login session
              and remember your preferences. We use a session cookie for
              authentication purposes. We do not use third-party tracking
              cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              5. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational security
              measures to protect your personal information, including encrypted
              connections (HTTPS/TLS), secure password hashing, and access
              controls. However, no method of transmission over the Internet is
              100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              6. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is
              active or as needed to provide you the Service. If you delete your
              account, we will delete your personal data, listening history,
              favorites, and other account data within 30 days. We may retain
              certain data as required by law or for legitimate business
              purposes (such as fraud prevention).
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              7. Your Rights
            </h2>
            <p className="mb-3">
              Depending on your location, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Access:</strong> Request a copy of the personal data we
                hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate
                data.
              </li>
              <li>
                <strong>Deletion:</strong> Delete your account and associated
                data at any time through your profile settings.
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing emails at
                any time via your profile settings or the unsubscribe link in
                our emails.
              </li>
              <li>
                <strong>Data Portability:</strong> Request a copy of your data
                in a portable format.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              8. California Residents (CCPA)
            </h2>
            <p>
              If you are a California resident, you have the right to know what
              personal information we collect, request deletion of your data,
              and opt out of the sale of your personal information. We do not
              sell your personal information. To exercise your CCPA rights,
              contact us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              9. European Residents (GDPR)
            </h2>
            <p>
              If you are located in the European Economic Area (EEA) or the
              United Kingdom, we process your personal data based on: your
              consent (e.g., marketing emails), contractual necessity (e.g.,
              providing the Service), and legitimate interests (e.g., security
              and fraud prevention). You have the right to withdraw consent at
              any time, lodge a complaint with a supervisory authority, and
              exercise the rights listed in Section 7.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              10. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not directed to children under 13. We do not
              knowingly collect personal information from children under 13. If
              we learn that we have collected personal information from a child
              under 13, we will take steps to delete that information promptly.
              If you believe a child under 13 has provided us with personal
              information, please contact us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              our website with a revised &quot;Last updated&quot; date. Your
              continued use of the Service after changes are posted constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              12. Contact
            </h2>
            <p>
              For privacy-related questions or requests, please contact us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              .
            </p>
          </section>
        </div>

        <p className="text-center text-text-dim text-xs mt-8">
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          <span className="mx-2">&middot;</span>
          <Link href="/" className="text-accent hover:underline">
            Back to HYMNZ
          </Link>
        </p>
      </div>
    </div>
  );
}
