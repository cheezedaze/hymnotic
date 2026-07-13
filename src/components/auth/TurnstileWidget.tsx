"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
// If Turnstile can't hand us a token within this window (script blocked by a
// webview, invalid site key, network issue), we treat it as failed and let the
// form fall back to its other bot defenses rather than trapping the user.
const LOAD_TIMEOUT_MS = 8000;

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      onToken("");
      onError?.();
    };

    function render() {
      if (!ref.current || !window.turnstile || widgetId.current) return;
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token) => {
            settled = true;
            onToken(token);
          },
          "expired-callback": () => onToken(""),
          "error-callback": () => fail(),
          theme: "dark",
        });
      } catch {
        fail();
      }
    }

    const timeout = setTimeout(fail, LOAD_TIMEOUT_MS);

    if (window.turnstile) {
      render();
      return () => clearTimeout(timeout);
    }
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = render;
      s.onerror = fail;
      document.head.appendChild(s);
      return () => clearTimeout(timeout);
    }
    const t = setInterval(() => {
      if (window.turnstile) {
        clearInterval(t);
        render();
      }
    }, 200);
    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [siteKey, onToken, onError]);

  return <div ref={ref} className="flex justify-center" />;
}
