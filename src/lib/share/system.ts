import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import type { ShareData } from "@/lib/store/shareStore";
import { buildShareText, buildShareUrl } from "./data";

export function canSystemShare(): boolean {
  return Capacitor.isNativePlatform()
    ? Capacitor.isPluginAvailable("Share")
    : typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function systemShare(data: ShareData): Promise<"shared" | "cancelled" | "unavailable"> {
  if (!canSystemShare()) return "unavailable";
  const payload = { title: data.title, text: buildShareText(data), url: buildShareUrl(data) };
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ ...payload, dialogTitle: "Share HYMNZ" });
    } else {
      // Invoke before any await to retain the browser's user activation.
      await navigator.share(payload);
    }
    return "shared";
  } catch (error) {
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError" || /cancel/i.test(err.message ?? "")) return "cancelled";
    throw error;
  }
}
