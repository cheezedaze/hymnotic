export function appleAssociation() {
  return {
    applinks: {
      details: [{
        appIDs: ["GGQ33S5R67.com.hymnz.app"],
        components: [
          { "/": "/track/*/*", exclude: true },
          { "/": "/track/", exclude: true },
          { "/": "/track/*", comment: "Open a HYMNZ track without autoplay." },
        ],
      }],
    },
  };
}

export function androidAssociation(value: string | undefined) {
  const fingerprints = [...new Set((value ?? "").split(",").map((part) => part.trim().toUpperCase()).filter(Boolean))];
  if (!fingerprints.length || fingerprints.some((part) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(part))) {
    throw new Error("Configure ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS with the Play App Signing SHA-256 certificate fingerprint.");
  }
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: "com.hymnz.app", sha256_cert_fingerprints: fingerprints },
  }];
}
