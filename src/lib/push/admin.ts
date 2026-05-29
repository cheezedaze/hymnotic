import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  app = initializeApp({
    credential: cert({
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key, // real newlines after base64 decode
    }),
  });
  return app;
}

export const adminMessaging = () => getMessaging(getAdminApp());
