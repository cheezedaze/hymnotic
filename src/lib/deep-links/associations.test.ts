import { afterEach, describe, expect, it, vi } from "vitest";
import { appleAssociation, androidAssociation } from "./associations";
import { GET as apple } from "@/app/.well-known/apple-app-site-association/route";
import { GET as android } from "@/app/.well-known/assetlinks.json/route";

afterEach(() => vi.unstubAllEnvs());
const fingerprint = Array(32).fill("AB").join(":");
describe("verified app associations", () => {
  it("authorizes only the production iOS app and track pages", async () => {
    const response = apple();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual(appleAssociation());
    expect(appleAssociation().applinks.details[0]).toMatchObject({ appIDs: ["GGQ33S5R67.com.hymnz.app"], components: expect.arrayContaining([{ "/": "/track/*/*", exclude: true }]) });
  });
  it("normalizes verified Android fingerprints without inventing missing identities", async () => {
    expect(androidAssociation(`${fingerprint.toLowerCase()},${fingerprint}`)[0].target).toEqual({ namespace: "android_app", package_name: "com.hymnz.app", sha256_cert_fingerprints: [fingerprint] });
    vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", fingerprint);
    expect(android().status).toBe(200);
    expect(await android().json()).toEqual(androidAssociation(fingerprint));
  });
  it.each([undefined, "", "invalid", `${fingerprint},BAD`])("does not publish a broken association: %s", (value) => {
    expect(() => androidAssociation(value)).toThrow();
    vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", value);
    const response = android();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
