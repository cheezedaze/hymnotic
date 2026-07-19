export type CheckoutPlan = "monthly" | "yearly";

/**
 * Extract a checkout plan from a relative `next` path like
 * "/subscribe?plan=monthly". Only /subscribe paths carry checkout intent —
 * the web plan buttons' 401 redirect is the sole writer of `plan=`.
 */
export function getPlanFromNext(next: string): CheckoutPlan | null {
  if (!next.startsWith("/subscribe")) return null;
  const queryIndex = next.indexOf("?");
  if (queryIndex === -1) return null;
  const plan = new URLSearchParams(next.slice(queryIndex + 1)).get("plan");
  return plan === "monthly" || plan === "yearly" ? plan : null;
}

/**
 * Post-auth destination: straight to auto-resumed checkout when the user was
 * mid-checkout, otherwise the original `next`.
 */
export function getPostAuthUrl(next: string): string {
  const plan = getPlanFromNext(next);
  return plan ? `/subscribe?plan=${plan}&checkout=1` : next;
}
