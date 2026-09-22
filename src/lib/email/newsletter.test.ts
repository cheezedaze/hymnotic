import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn(), add: vi.fn(), segment: vi.fn(), select: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { contacts = { get: mocks.get, create: mocks.create, update: mocks.update, segments: { add: mocks.add } }; segments = { get: mocks.segment }; } }));
vi.mock("@/lib/db", () => ({ db: { select: mocks.select } }));
import { addContactToNewsletter, removeContactFromNewsletter, syncAllNewsletterContacts } from "./newsletter";
const ok = (data: unknown = { id: "contact" }) => ({ data, error: null });
const failure = (statusCode: number, message = "Failed") => ({ data: null, error: { statusCode, name: "test_error", message } });
const run = async <T>(promise: Promise<T>) => { const result = promise.catch((error) => error); await vi.runAllTimersAsync(); const value = await result; if (value instanceof Error) throw value; return value as T; };

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("RESEND_SEGMENT_ID", "newsletter-segment"); vi.stubEnv("RESEND_AUDIENCE_ID", "legacy-segment");
  mocks.get.mockResolvedValue(ok({ id: "contact", unsubscribed: false }));
  for (const mock of [mocks.create, mocks.update, mocks.add, mocks.segment]) mock.mockResolvedValue(ok());
  mocks.select.mockImplementation((fields) => ({ from: () => ({ where: () => fields.total ? Promise.resolve([{ total: 1 }]) : { orderBy: () => ({ limit: () => Promise.resolve([{ id: "user", email: "listener@example.test", name: "Listener" }]) }) } }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("newsletter sync", () => {
  it("reports the missing production segment configuration clearly", async () => {
    vi.stubEnv("RESEND_SEGMENT_ID", ""); vi.stubEnv("RESEND_AUDIENCE_ID", "");
    await expect(syncAllNewsletterContacts()).rejects.toThrow("RESEND_SEGMENT_ID");
  });
  it("creates missing confirmed contacts in the configured segment", async () => {
    mocks.get.mockResolvedValue(failure(404));
    await run(addContactToNewsletter("listener@example.test", "Listener"));
    expect(mocks.create).toHaveBeenCalledWith({ email: "listener@example.test", firstName: "Listener", unsubscribed: false, segments: [{ id: "newsletter-segment" }] });
  });
  it("supports the existing audience environment variable", async () => {
    vi.stubEnv("RESEND_SEGMENT_ID", " ");
    await run(addContactToNewsletter("listener@example.test"));
    expect(mocks.add).toHaveBeenCalledWith({ contactId: "contact", segmentId: "legacy-segment" });
  });
  it("retries rate limits and adds existing contacts to the segment explicitly", async () => {
    mocks.add.mockResolvedValueOnce({ ...failure(429), headers: { "retry-after": "1" } }).mockResolvedValueOnce(ok());
    const result = await run(syncAllNewsletterContacts());
    expect(result.synced).toBe(1); expect(mocks.add).toHaveBeenCalledTimes(2); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("preserves campaign unsubscribes during bulk repair", async () => {
    mocks.get.mockResolvedValue(ok({ id: "contact", unsubscribed: true }));
    const result = await run(syncAllNewsletterContacts());
    expect(result.skippedUnsubscribed).toBe(1); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.add).not.toHaveBeenCalled();
  });
  it("returns a continuation cursor after ten contacts instead of timing out on an entire list", async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({ id: `user-${index}`, email: `listener-${index}@example.test`, name: null }));
    mocks.select.mockImplementation((fields) => ({ from: () => ({ where: () => fields.total ? Promise.resolve([{ total: 11 }]) : { orderBy: () => ({ limit: () => Promise.resolve(rows) }) } }) }));
    const result = await run(syncAllNewsletterContacts());
    expect(result).toMatchObject({ total: 11, synced: 10, nextCursor: "user-9" });
    expect(mocks.get).toHaveBeenCalledTimes(10);
  });
  it("resubscribes only on an explicit opt-in", async () => {
    mocks.get.mockResolvedValue(ok({ id: "contact", unsubscribed: true }));
    await run(addContactToNewsletter("listener@example.test"));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ unsubscribed: false }));
  });
  it("surfaces authorization and unsubscribe failures instead of silently succeeding", async () => {
    mocks.get.mockResolvedValue(failure(401));
    await expect(run(removeContactFromNewsletter("listener@example.test"))).rejects.toThrow("full access");
  });
});
