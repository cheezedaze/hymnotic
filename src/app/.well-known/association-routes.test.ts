import { afterEach, expect, it, vi } from "vitest";
import { GET as getAppleAssociation } from "./apple-app-site-association/route";
import { GET as getAndroidAssociation } from "./assetlinks.json/route";

const fingerprintA = Array.from({ length: 32 }, () => "AA").join(":");

afterEach(() => vi.unstubAllEnvs());

it("serves both association documents directly as JSON", async () => {
  const apple = await getAppleAssociation();
  expect(apple.status).toBe(200);
  expect(apple.headers.get("content-type")).toContain("application/json");
  expect(apple.headers.get("location")).toBeNull();

  vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", fingerprintA);
  const android = await getAndroidAssociation();
  expect(android.status).toBe(200);
  expect(android.headers.get("content-type")).toContain("application/json");
  expect(android.headers.get("location")).toBeNull();
});

it("fails closed when Android signing data is absent", async () => {
  vi.stubEnv("ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS", "");
  const misconfigured = await getAndroidAssociation();
  expect(misconfigured.status).toBe(503);
  expect(misconfigured.headers.get("cache-control")).toBe("no-store");
});

it("fails closed when Android signing data is malformed", async () => {
  vi.stubEnv(
    "ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS",
    `${fingerprintA},not-a-fingerprint`
  );
  const misconfigured = await getAndroidAssociation();
  expect(misconfigured.status).toBe(503);
  expect(misconfigured.headers.get("cache-control")).toBe("no-store");
});
