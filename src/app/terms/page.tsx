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
            Last updated: March 11, 2026
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8 space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the HYMNZ service, you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please
              do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              2. Description of Service
            </h2>
            <p>
              HYMNZ provides a music streaming platform focused on hymns and
              sacred music. We offer both free and premium subscription tiers
              with varying levels of access to our content library.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              3. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must provide accurate and complete information when
              creating an account.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              4. Content and Intellectual Property
            </h2>
            <p>
              All music, artwork, and other content available through HYMNZ is
              protected by copyright and other intellectual property laws. You
              may not reproduce, distribute, or create derivative works from our
              content without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              5. Subscriptions and Payments
            </h2>
            <p>
              Premium subscriptions are billed on a recurring basis. You may
              cancel your subscription at any time. Refunds are handled in
              accordance with our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              6. Contact
            </h2>
            <p>
              For questions about these terms, please contact us at{" "}
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
          <Link href="/" className="text-accent hover:underline">
            Back to HYMNZ
          </Link>
        </p>
      </div>
    </div>
  );
}
