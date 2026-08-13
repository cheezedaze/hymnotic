import { describe, expect, it } from "vitest";
import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
  parseAndroidFingerprints,
} from "./associations";

const fingerprintA = Array.from({ length: 32 }, () => "AA").join(":");
const fingerprintB = Array.from({ length: 32 }, () => "BB").join(":");

describe("deep-link associations", () => {
  it("scopes Apple Universal Links to production tracks", () => {
    expect(buildAppleAppSiteAssociation()).toEqual({
      applinks: {
        apps: [],
        details: [
          {
            appIDs: ["GGQ33S5R67.com.hymnz.app"],
            components: [
              {
                "/": "/track/*",
                comment: "Open public HYMNZ track links",
              },
            ],
          },
        ],
      },
    });
  });

  it("normalizes, de-duplicates, and accepts multiple Android fingerprints", () => {
    expect(
      parseAndroidFingerprints(
        `${fingerprintA}, ${fingerprintB}, ${fingerprintA}`
      )
    ).toEqual([fingerprintA, fingerprintB]);
  });

  it("rejects empty and malformed Android fingerprints", () => {
    expect(() => parseAndroidFingerprints(undefined)).toThrow(
      "ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS is required"
    );
    expect(() => parseAndroidFingerprints("not-a-fingerprint")).toThrow(
      "Invalid Android SHA-256 certificate fingerprint"
    );
  });

  it("builds the production Android association", () => {
    expect(buildAndroidAssetLinks(fingerprintA)).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.hymnz.app",
          sha256_cert_fingerprints: [fingerprintA],
        },
      },
    ]);
  });
});
