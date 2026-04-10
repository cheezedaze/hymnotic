import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | HYMNZ",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Last updated: April 9, 2026
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8 space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the HYMNZ service (&quot;Service&quot;),
              including our website at hymnz.com and mobile applications, you
              agree to be bound by these Terms of Service (&quot;Terms&quot;). If
              you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              2. Eligibility
            </h2>
            <p>
              You must be at least 13 years of age to use the Service. If you
              are under 18, you represent that you have your parent or
              guardian&apos;s permission to use the Service. By using the
              Service, you represent and warrant that you meet these
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              3. Description of Service
            </h2>
            <p>
              HYMNZ provides a music streaming platform focused on hymns and
              sacred music. We offer both free and premium subscription tiers
              with varying levels of access to our content library.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>Free tier:</strong> Limited access including preview
                clips and a selection of featured tracks.
              </li>
              <li>
                <strong>Premium tier:</strong> Full access to our entire catalog
                with unlimited full-length streaming.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              4. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must provide accurate and complete information when
              creating an account. You agree to notify us immediately of any
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              5. Subscriptions, Payments, and Auto-Renewal
            </h2>
            <p className="mb-3">
              HYMNZ Premium is available as a monthly or yearly subscription.
              Subscription fees are charged through our payment processor,
              Stripe.
            </p>
            <p className="mb-3">
              <strong>Auto-Renewal:</strong> Your subscription will
              automatically renew at the end of each billing period (monthly or
              yearly) unless you cancel before the renewal date. The renewal
              charge will be at the then-current subscription rate.
            </p>
            <p className="mb-3">
              <strong>Introductory Pricing:</strong> If you subscribe with an
              introductory offer, your subscription will automatically renew at
              the standard rate after the introductory period ends unless you
              cancel before the introductory period expires.
            </p>
            <p className="mb-3">
              <strong>Cancellation:</strong> You may cancel your subscription at
              any time through your account settings or by contacting us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              . Cancellation takes effect at the end of your current billing
              period. You will retain access to premium features until the end
              of the period you have already paid for.
            </p>
            <p>
              <strong>Price Changes:</strong> We reserve the right to change
              subscription pricing. We will notify you of any price changes in
              advance, and your continued use of the Service after a price
              change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              6. Refund Policy
            </h2>
            <p className="mb-3">
              If you are unsatisfied with the Service, you may request a refund
              within 7 days of your initial subscription purchase by contacting
              us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>
              .
            </p>
            <p>
              Renewal charges are generally non-refundable, but we will consider
              refund requests on a case-by-case basis. If you purchased through
              the Apple App Store or Google Play Store, refunds are handled
              according to their respective refund policies.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              7. License and Content Usage
            </h2>
            <p className="mb-3">
              Subject to your compliance with these Terms, HYMNZ grants you a
              limited, non-exclusive, non-transferable, revocable license to
              access and use the Service for your personal, non-commercial use.
            </p>
            <p className="mb-3">
              All music, artwork, and other content available through HYMNZ is
              protected by copyright and other intellectual property laws. You
              may not reproduce, distribute, modify, create derivative works
              from, publicly display, publicly perform, or otherwise exploit our
              content without express written permission.
            </p>
            <p>
              This license does not grant you any right to download, copy,
              store, or redistribute any content from the Service except as
              expressly permitted. Streaming is for personal listening purposes
              only.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              8. Account Deletion
            </h2>
            <p>
              You may delete your account at any time through your profile
              settings. Upon deletion, all your personal data, listening
              history, favorites, and other account data will be permanently
              removed. Any active subscription will be canceled. Account
              deletion is irreversible.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              9. Prohibited Conduct
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Use the Service for any unlawful purpose or in violation of any
                applicable laws.
              </li>
              <li>
                Attempt to circumvent any content protection or access
                restrictions.
              </li>
              <li>
                Share your account credentials with others or allow multiple
                users to access a single account.
              </li>
              <li>
                Use automated systems or bots to access the Service.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              10. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service at any time
              for any reason, including violation of these Terms. Upon
              termination, your license to use the Service ceases immediately.
              Any provisions of these Terms that by their nature should survive
              termination shall survive.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              11. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, either express or
              implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              12. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, HYMNZ shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenues, whether incurred
              directly or indirectly, or any loss of data, use, goodwill, or
              other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              13. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of
              material changes by posting the updated Terms on our website with
              a revised &quot;Last updated&quot; date. Your continued use of the
              Service after changes are posted constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              14. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the United States, without regard to conflict of law
              principles.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              15. Contact
            </h2>
            <p>
              For questions about these Terms, please contact us at{" "}
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
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
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
