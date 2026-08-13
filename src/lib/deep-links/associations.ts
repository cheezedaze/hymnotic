const APPLE_APP_ID = "GGQ33S5R67.com.hymnz.app";
const ANDROID_PACKAGE = "com.hymnz.app";

export function buildAppleAppSiteAssociation() {
  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [APPLE_APP_ID],
          components: [
            {
              "/": "/track/*",
              comment: "Open public HYMNZ track links",
            },
          ],
        },
      ],
    },
  };
}

export function parseAndroidFingerprints(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    throw new Error("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS is required");
  }

  const normalized = raw.split(",").map((candidate) => {
    const hex = candidate.replaceAll(":", "").trim().toUpperCase();
    if (!/^[A-F0-9]{64}$/.test(hex)) {
      throw new Error("Invalid Android SHA-256 certificate fingerprint");
    }
    return hex.match(/.{2}/g)!.join(":");
  });

  return [...new Set(normalized)];
}

export function buildAndroidAssetLinks(raw: string | undefined) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: parseAndroidFingerprints(raw),
      },
    },
  ];
}
