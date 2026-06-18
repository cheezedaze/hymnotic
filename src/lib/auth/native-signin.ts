/**
 * Native platforms (Capacitor WebView) cannot complete Google's OAuth in-app:
 * Google detects the embedded user agent and bumps the flow to the system
 * browser, which doesn't share cookies with the WebView. So on native we use
 * the Google/Apple SDK to obtain an ID token, then exchange it server-side
 * via /api/auth/mobile/{provider} for a NextAuth-compatible session cookie.
 */

/**
 * The native account picker can stall indefinitely (e.g. an Android OAuth
 * client / SHA-1 misconfiguration), leaving `SocialLogin.login()` pending
 * forever. Cap the wait so the caller's catch fires and the UI shows an error
 * instead of an endless spinner.
 */
const NATIVE_LOGIN_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("native_login_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function nativeSignIn(
  provider: "google" | "apple"
): Promise<{ ok: boolean; error?: string }> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return { ok: false, error: "not_native" };

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (provider === "google") {
    const res = await withTimeout(
      SocialLogin.login({
        provider: "google",
        // Don't pass a custom `scopes` array: the plugin already requests
        // email/profile/openid by default, and supplying scopes triggers the
        // Google authorization flow, which requires a native MainActivity
        // subclass we don't use ("CANNOT use scopes without modifying the main
        // activity"). The returned ID token still carries email + name.
        options: {},
      }),
      NATIVE_LOGIN_TIMEOUT_MS
    );
    const idToken =
      res.result && "idToken" in res.result ? (res.result.idToken as string | null) : null;
    if (!idToken) return { ok: false, error: "no_id_token" };
    const r = await fetch("/api/auth/mobile/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
    });
    return r.ok ? { ok: true } : { ok: false, error: `server_${r.status}` };
  }

  const res = await withTimeout(
    SocialLogin.login({
      provider: "apple",
      options: { scopes: ["name", "email"] },
    }),
    NATIVE_LOGIN_TIMEOUT_MS
  );
  const idToken = res.result?.idToken ?? null;
  if (!idToken) return { ok: false, error: "no_id_token" };
  const profile = res.result?.profile;
  const fullName = profile
    ? [profile.givenName, profile.familyName].filter(Boolean).join(" ").trim() || null
    : null;
  const r = await fetch("/api/auth/mobile/apple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, name: fullName }),
    credentials: "include",
  });
  return r.ok ? { ok: true } : { ok: false, error: `server_${r.status}` };
}
