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
            Last updated: March 11, 2026
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8 space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              1. Information We Collect
            </h2>
            <p>
              We collect information you provide when creating an account,
              including your name and email address. We also collect usage data
              such as listening history and preferences to improve your
              experience.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              2. How We Use Your Information
            </h2>
            <p>
              We use your information to provide and improve our service,
              personalize your experience, process transactions, and communicate
              with you about your account and updates to our service.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              3. Data Security
            </h2>
            <p>
              We implement appropriate security measures to protect your personal
              information. However, no method of transmission over the Internet
              is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              4. Third-Party Services
            </h2>
            <p>
              We may use third-party services for payment processing and
              analytics. These services have their own privacy policies governing
              the use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              5. Your Rights
            </h2>
            <p>
              You have the right to access, update, or delete your personal
              information at any time. You may also request a copy of the data we
              hold about you.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              6. Contact
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
          <Link href="/" className="text-accent hover:underline">
            Back to HYMNZ
          </Link>
        </p>
      </div>
    </div>
  );
}
