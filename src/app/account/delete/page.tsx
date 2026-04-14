import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Delete Your Account | HYMNZ",
};

export default function DeleteAccountPage() {
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
            Delete Your Account
          </h1>
          <p className="text-text-muted text-sm mt-2">
            How to delete your HYMNZ account and associated data
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8 space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              How to Delete Your Account
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Sign in to your HYMNZ account at{" "}
                <a
                  href="https://www.hymnz.com/auth/signin"
                  className="text-accent hover:underline"
                >
                  hymnz.com
                </a>{" "}
                or in the HYMNZ app.
              </li>
              <li>
                Go to your{" "}
                <Link href="/profile" className="text-accent hover:underline">
                  Profile
                </Link>{" "}
                page.
              </li>
              <li>
                Scroll to the bottom and tap{" "}
                <strong className="text-text-primary">
                  &quot;Delete account&quot;
                </strong>
                .
              </li>
              <li>
                Type <strong className="text-text-primary">DELETE</strong> to
                confirm.
              </li>
              <li>
                Your account and all associated data will be permanently
                deleted.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              What Data Is Deleted
            </h2>
            <p className="mb-3">
              When you delete your account, the following data is permanently
              removed:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your account information (name, email address)</li>
              <li>Listening history and play counts</li>
              <li>Saved favorites</li>
              <li>Notification and announcement preferences</li>
              <li>Newsletter subscription preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              Active Subscriptions
            </h2>
            <p>
              If you have an active HYMNZ Premium subscription, it will be
              automatically canceled when you delete your account. You will not
              be charged again after deletion.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              Data Retention
            </h2>
            <p>
              Account deletion is processed immediately upon confirmation. All
              personal data is removed within 30 days. We may retain certain
              anonymized, non-personal data as required by law or for legitimate
              business purposes such as fraud prevention.
            </p>
          </section>

          <section>
            <h2 className="text-display text-lg font-semibold text-text-primary mb-3">
              Need Help?
            </h2>
            <p>
              If you are unable to access your account or need assistance with
              account deletion, contact us at{" "}
              <a
                href="mailto:hello@hymnz.com"
                className="text-accent hover:underline"
              >
                hello@hymnz.com
              </a>{" "}
              and we will process your request.
            </p>
          </section>
        </div>

        <p className="text-center text-text-dim text-xs mt-8">
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          <span className="mx-2">&middot;</span>
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
