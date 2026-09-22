import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAuthAdmin: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ requireAuthAdmin: mocks.requireAuthAdmin }));
vi.mock("@/lib/email/newsletter", () => ({ syncAllNewsletterContacts: mocks.sync, NewsletterSyncError: class extends Error {} }));
import { NewsletterSyncError } from "@/lib/email/newsletter";
import { POST } from "./route";
beforeEach(() => { vi.clearAllMocks(); mocks.requireAuthAdmin.mockResolvedValue({ user: { id: "admin" } }); });

describe("admin newsletter sync", () => {
  it("requires admin authentication before accessing newsletter contacts", async () => {
    mocks.requireAuthAdmin.mockResolvedValue(null);
    expect((await POST(new Request("http://localhost/api/admin/newsletter/sync", { method: "POST" }))).status).toBe(401);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("returns actionable configuration failures to the admin", async () => {
    mocks.sync.mockRejectedValue(new NewsletterSyncError("Configure RESEND_SEGMENT_ID on the server."));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await POST(new Request("http://localhost/api/admin/newsletter/sync", { method: "POST" }));
    log.mockRestore();
    expect(result.status).toBe(500); expect((await result.json()).error).toContain("RESEND_SEGMENT_ID");
  });
  it("passes the continuation cursor to the next batch", async () => {
    mocks.sync.mockResolvedValue({ total: 16, synced: 6, failed: [], nextCursor: null });
    const result = await POST(new Request("http://localhost/api/admin/newsletter/sync?cursor=user-10", { method: "POST" }));
    expect(result.status).toBe(200); expect(mocks.sync).toHaveBeenCalledWith("user-10");
  });
});
