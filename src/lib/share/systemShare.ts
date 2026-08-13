import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import type { SharePayload } from "./shareData";

export type SystemShareResult =
  | "shared"
  | "unavailable"
  | "cancelled"
  | "failed";

export function canUseSystemShare(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof navigator !== "undefined" && typeof navigator.share === "function")
  );
}

function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function shareWithSystem(
  payload: SharePayload
): Promise<SystemShareResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        ...payload,
        dialogTitle: `Share ${payload.title}`,
      });
      return "shared";
    }

    if (typeof navigator === "undefined" || !navigator.share) {
      return "unavailable";
    }

    await navigator.share(payload);
    return "shared";
  } catch (error) {
    return isCancellation(error) ? "cancelled" : "failed";
  }
}
