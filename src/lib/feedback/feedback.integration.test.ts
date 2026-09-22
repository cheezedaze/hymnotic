import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFile } from "node:fs/promises";
import * as schema from "@/lib/db/schema";

const url = process.env.FEEDBACK_TEST_DATABASE_URL;
const mocks = vi.hoisted(() => ({ auth: vi.fn(), requireAuthAdmin: vi.fn(), send: vi.fn(), multicast: vi.fn(), after: vi.fn(), mediaExists: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth, requireAuthAdmin: mocks.requireAuthAdmin }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/db/index", () => ({ db }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("@/lib/push/admin", () => ({ adminMessaging: () => ({ sendEachForMulticast: mocks.multicast }) }));
vi.mock("@/lib/s3/client", () => ({ mediaExists: mocks.mediaExists }));
vi.mock("next/server", async (importOriginal) => ({ ...await importOriginal<typeof import("next/server")>(), after: mocks.after }));
const client = url ? postgres(url, { max: 10, prepare: false, onnotice: () => {} }) : null;
const db = client ? drizzle(client, { schema }) : null!;
let queries: typeof import("./queries");
let submit: typeof import("@/app/api/feedback/route");
let reply: typeof import("@/app/api/admin/feedback/[id]/reply/route");
let inbox: typeof import("@/app/api/admin/feedback/route");
let announcements: typeof import("@/lib/db/queries");
let notification: typeof import("./notifications");
let releases: typeof import("@/lib/tracks/releases");
let history: typeof import("@/app/api/announcements/history/route");
const request = (body: unknown) => new Request("http://localhost/api/feedback", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const payload = (extra = {}) => ({ id: crypto.randomUUID(), message: "I enjoy the hymns and would love easier browsing.", allowContact: false, ...extra });
const fetchMock = vi.fn();

describe.skipIf(!url)("feedback and update history (disposable PostgreSQL)", () => {
  beforeAll(async () => {
    if (!["localhost", "127.0.0.1"].includes(new URL(url!).hostname)) throw new Error("A disposable local test database is required");
    queries = await import("./queries"); submit = await import("@/app/api/feedback/route");
    reply = await import("@/app/api/admin/feedback/[id]/reply/route"); inbox = await import("@/app/api/admin/feedback/route");
    announcements = await import("@/lib/db/queries"); notification = await import("./notifications");
    releases = await import("@/lib/tracks/releases"); history = await import("@/app/api/announcements/history/route");
  });
  beforeEach(async () => {
    vi.clearAllMocks(); vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubGlobal("fetch", fetchMock);
    await client!`TRUNCATE users, feedback, feedback_replies, announcements, tracks, collections CASCADE`;
    await db.insert(schema.users).values([{ id: "listener", email: "listener@example.test" }, { id: "admin", email: "admin@hymnotic.app", role: "ADMIN" }, { id: "other-admin", email: "other@example.test", role: "ADMIN" }]);
    mocks.auth.mockResolvedValue({ user: { id: "listener", email: "listener@example.test", isPremium: false } });
    mocks.requireAuthAdmin.mockResolvedValue({ user: { id: "admin" } });
    mocks.send.mockResolvedValue({ data: { id: "email-123" }, error: null });
    mocks.multicast.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    mocks.mediaExists.mockResolvedValue(true);
    fetchMock.mockResolvedValue(Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Thank you for sharing your thoughts on browsing HYMNZ." }] } }] }));
  });
  afterAll(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await client?.end(); });

  it("blocks visitors and malformed requests before saving or generating", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    expect((await submit.POST(request(payload()))).status).toBe(401);
    for (const input of [null, [], payload({ message: " " }), payload({ message: "x".repeat(3001) }), payload({ allowContact: "true" }), payload({ id: "not-a-uuid" })]) {
      expect((await submit.POST(request(input))).status).toBe(400);
    }
    expect(await db.select().from(schema.feedback)).toHaveLength(0); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("lets free accounts submit, saves Gemini's acknowledgement, and ignores forged contact details", async () => {
    const input = payload({ allowContact: true, contactEmail: "attacker@example.test", userId: "admin" });
    const result = await submit.POST(request(input));
    expect(result.status).toBe(201);
    const [saved] = await db.select().from(schema.feedback);
    expect(saved).toMatchObject({ userId: "listener", contactEmail: "listener@example.test", allowContact: true, responseSource: "gemini" });
    expect(saved.acknowledgement).toBe((await result.json()).acknowledgement);
    expect(fetchMock.mock.calls[0][1].body).not.toContain("listener@example.test");
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
  it("keeps feedback and a fallback acknowledgement when Gemini is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await submit.POST(request(payload()))).status).toBe(201);
    const [saved] = await db.select().from(schema.feedback);
    expect(saved.contactEmail).toBeNull(); expect(saved.responseSource).toBe("fallback"); expect(saved.acknowledgement).toContain("received");
  });
  it("deduplicates retry IDs and enforces three messages/hour under concurrency", async () => {
    const input = payload();
    const first = await queries.createFeedback({ ...input, userId: "listener" });
    const retry = await queries.createFeedback({ ...input, userId: "listener" });
    expect(first.created).toBe(true); expect(retry.created).toBe(false);
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => queries.createFeedback({ ...payload(), userId: "listener" })));
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(2);
    expect(await db.select().from(schema.feedback)).toHaveLength(3);
    expect((await submit.POST(request(payload()))).status).toBe(429);
  });
  it("does not let a different account retrieve another user's submission by ID", async () => {
    const input = payload(); await queries.createFeedback({ ...input, userId: "listener" });
    mocks.auth.mockResolvedValue({ user: { id: "other-admin" } });
    expect((await submit.POST(request(input))).status).toBe(409);
  });
  it("protects the inbox and reply endpoint and requires contact consent", async () => {
    const { entry } = await queries.createFeedback({ ...payload(), userId: "listener" });
    const context = { params: Promise.resolve({ id: entry.id }) };
    mocks.requireAuthAdmin.mockResolvedValueOnce(null);
    expect((await inbox.GET(new Request("http://localhost/api/admin/feedback"))).status).toBe(401);
    mocks.requireAuthAdmin.mockResolvedValueOnce(null);
    expect((await reply.POST(request({ id: crypto.randomUUID(), body: "Thanks" }), context)).status).toBe(401);
    expect((await reply.POST(request({ id: crypto.randomUUID(), body: "Thanks" }), context)).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("emails only the consented account address and avoids duplicate replies on retry", async () => {
    const { entry } = await queries.createFeedback({ ...payload({ allowContact: true }), userId: "listener" });
    const context = { params: Promise.resolve({ id: entry.id }) }; const input = { id: crypto.randomUUID(), body: "Thank you for your note.", to: "attacker@example.test" };
    expect((await reply.POST(request(input), context)).status).toBe(200);
    expect((await reply.POST(request(input), context)).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: "listener@example.test", replyTo: "hello@hymnz.com" }), { idempotencyKey: `feedback-reply/${input.id}` });
    expect(await db.select().from(schema.feedbackReplies)).toHaveLength(1);
  });
  it("retains failed reply attempts and retries with the same key and text", async () => {
    const { entry } = await queries.createFeedback({ ...payload({ allowContact: true }), userId: "listener" });
    const context = { params: Promise.resolve({ id: entry.id }) }; const input = { id: crypto.randomUUID(), body: "Thanks" };
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: "Rate limited" } });
    expect((await reply.POST(request(input), context)).status).toBe(502);
    expect((await reply.POST(request({ ...input, body: "Changed" }), context)).status).toBe(409);
    expect((await reply.POST(request(input), context)).status).toBe(200);
    expect(mocks.send.mock.calls[0][1]).toEqual(mocks.send.mock.calls[1][1]);
  });
  it("sends admin alerts only to hello and the exact admin's active devices", async () => {
    const { entry } = await queries.createFeedback({ ...payload(), userId: "listener" });
    await db.insert(schema.devicePushTokens).values([
      { userId: "admin", token: "admin-active", platform: "ios" },
      { userId: "admin", token: "admin-inactive", platform: "ios", active: false },
      { userId: "listener", token: "listener-device", platform: "ios" },
      { userId: "other-admin", token: "other-admin-device", platform: "ios" },
      { token: "anonymous", platform: "ios" },
    ]);
    await notification.notifyFeedback(entry);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: "hello@hymnz.com", replyTo: undefined }), expect.anything());
    expect(mocks.multicast).toHaveBeenCalledWith(expect.objectContaining({ tokens: ["admin-active"] }));
    const [saved] = await db.select().from(schema.feedback);
    expect(saved.emailNotificationStatus).toBe("sent"); expect(saved.pushNotificationStatus).toBe("sent");
  });
  it("records a missing push device and failed email without losing the feedback", async () => {
    const { entry } = await queries.createFeedback({ ...payload(), userId: "listener" });
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: "Unavailable" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await notification.notifyFeedback(entry); log.mockRestore();
    const [saved] = await db.select().from(schema.feedback);
    expect(saved.emailNotificationStatus).toBe("failed"); expect(saved.pushNotificationStatus).toBe("unavailable"); expect(mocks.multicast).not.toHaveBeenCalled();
  });
  it("paginates 20 dated updates at a time with stable ties and excludes drafts/future updates", async () => {
    const publishedAt = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < 45; i++) await announcements.createAnnouncement({ title: `Update ${i}`, body: "<p>Update</p>", publishedAt });
    await announcements.createAnnouncement({ title: "Draft", body: "Draft" });
    await announcements.createAnnouncement({ title: "Future", body: "Future", publishedAt: new Date("2099-01-01") });
    const first = (await announcements.getAnnouncementHistory())!;
    expect(first.announcements).toHaveLength(20);
    await announcements.createAnnouncement({ title: "Newer", body: "New", publishedAt: new Date("2026-02-01") });
    const second = (await announcements.getAnnouncementHistory(first.nextCursor!))!;
    const third = (await announcements.getAnnouncementHistory(second.nextCursor!))!;
    expect(second.announcements).toHaveLength(20); expect(third.announcements).toHaveLength(5); expect(third.nextCursor).toBeNull();
    expect(new Set([...first.announcements, ...second.announcements, ...third.announcements].map((a) => a.id)).size).toBe(45);
    expect((await history.GET(new Request("http://localhost/api/announcements/history?cursor=-1"))).status).toBe(400);
  });
  it("retains original publication dates when updates are replaced by track releases", async () => {
    const original = new Date("2026-01-01T00:00:00Z");
    const old = await announcements.createAnnouncement({ title: "Old", body: "Old", publishedAt: original });
    await announcements.updateAnnouncement(old.id, { publishedAt: null });
    await announcements.updateAnnouncement(old.id, { publishedAt: new Date("2026-02-01") });
    await db.insert(schema.collections).values({ id: "collection", title: "Collection" });
    await db.insert(schema.tracks).values({ id: "track", collectionId: "collection", title: "Track", duration: 20, trackNumber: 1, audioKey: "audio/tracks/test.mp3" });
    await releases.scheduleTrackRelease("track", { immediate: true, announcementTitle: "New", announcementBody: "<p>New</p>" });
    await releases.processTrackRelease("track");
    const rows = (await announcements.getAnnouncementHistory())!.announcements;
    expect(rows).toHaveLength(2); expect(rows.find((a) => a.id === old.id)?.publishedAt).toEqual(original);
    expect((await announcements.getAnnouncementById(old.id))?.publishedAt).toBeNull();
  });
  it("migrates historical dates only with evidence of publication", async () => {
    await client!`DROP TABLE feedback_replies, feedback`;
    await client!`ALTER TABLE announcements DROP COLUMN first_published_at, DROP COLUMN history_date_estimated`;
    const rows = await client!`INSERT INTO announcements(title,body,published_at) VALUES ('Published','Body','2026-01-01'),('Archived','Body',null),('Draft','Body',null) RETURNING id`;
    await client!`INSERT INTO announcement_dismissals(user_id,announcement_id,dismissed_at) VALUES ('listener',${rows[1].id},'2026-02-01')`;
    const migration = await client!.reserve();
    try { await migration.unsafe(await readFile(new URL("../../../drizzle/0014_feedback_and_update_history.sql", import.meta.url), "utf8")); }
    finally { migration.release(); }
    const migrated = (await announcements.getAnnouncementHistory())!.announcements;
    expect(migrated.map((a) => a.title)).toEqual(["Archived", "Published"]);
    expect(migrated[0].dateEstimated).toBe(true); expect(migrated[1].dateEstimated).toBe(false);
  });
});
