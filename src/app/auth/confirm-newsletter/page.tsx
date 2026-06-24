import Image from "next/image";
import Link from "next/link";

type Search = { token?: string; status?: string };

const MESSAGES: Record<string, { heading: string; body: string }> = {
  confirmed: {
    heading: "You're subscribed!",
    body: "Thanks for confirming. You'll now receive updates about new music, collections, and HYMNZ news.",
  },
  already: {
    heading: "Already confirmed",
    body: "This subscription was already confirmed. You're all set.",
  },
  expired: {
    heading: "Link expired",
    body: "This confirmation link has expired. You can re-subscribe anytime from your profile settings.",
  },
  invalid: {
    heading: "Invalid link",
    body: "This confirmation link isn't valid. You can subscribe from your profile settings.",
  },
  error: {
    heading: "Something went wrong",
    body: "We couldn't confirm your subscription just now. Please try again in a moment.",
  },
};

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { token, status } = await searchParams;

  return (
    <div className="min-h-dvh bg-midnight flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/hymnz-logo1.png"
            alt="HYMNZ"
            width={80}
            height={80}
            className="mb-3 w-20 h-20"
          />
          <h1 className="text-display text-2xl font-bold text-text-primary">
            Newsletter
          </h1>
        </div>

        <div className="glass-heavy rounded-2xl p-6">
          {status ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {(MESSAGES[status] ?? MESSAGES.invalid).heading}
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                {(MESSAGES[status] ?? MESSAGES.invalid).body}
              </p>
              <Link
                href="/"
                className="inline-block mt-6 py-3 px-6 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
              >
                Continue to HYMNZ
              </Link>
            </>
          ) : token ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Confirm your subscription
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Click below to start receiving updates about new music,
                collections, and HYMNZ news.
              </p>
              <form action="/api/newsletter/confirm" method="POST">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="w-full py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-semibold rounded-xl transition-colors"
                >
                  Confirm Subscription
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Invalid link
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                This confirmation link is missing its token.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
