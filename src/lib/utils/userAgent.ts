export type WebPlatform = "ios" | "android" | "desktop" | "unknown";

export function detectPlatform(userAgent: string | null | undefined): WebPlatform {
  if (!userAgent) return "unknown";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /FBAN|FBAV|Instagram|Line\/|; wv\)|Twitter|TikTok|Pinterest|Snapchat/i.test(
    userAgent
  );
}
