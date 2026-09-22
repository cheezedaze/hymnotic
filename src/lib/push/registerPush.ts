/**
 * Registers the device for FCM push notifications. No-op on the web — only runs
 * inside the iOS/Android Capacitor shell. Requests permission, fetches the FCM
 * token, and POSTs it to /api/push/register (anonymous; userId is attached
 * server-side if a session cookie is present). Also re-posts on token refresh.
 */
export async function registerPushNotifications() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return false;

  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

  const perm = await FirebaseMessaging.requestPermissions();
  if (perm.receive !== "granted") return false;

  // On iOS this also triggers APNs registration under the hood.
  const { token } = await FirebaseMessaging.getToken();
  if (token) await postToken(token);

  // FCM rotates tokens — keep the server in sync.
  await FirebaseMessaging.addListener("tokenReceived", (event) => {
    if (event.token) postToken(event.token).catch(() => {});
  });
  return Boolean(token);
}

async function postToken(token: string) {
  const { Capacitor } = await import("@capacitor/core");
  const response = await fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // attach NextAuth cookie if logged in
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
  if (!response.ok) throw new Error("Could not register this device for notifications.");
}
