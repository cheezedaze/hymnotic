import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthAdmin: vi.fn(), createAnnouncement: vi.fn(), updateAnnouncement: vi.fn(),
  getAnnouncementById: vi.fn(), getTrackById: vi.fn(), getAllAnnouncements: vi.fn(), deleteAnnouncement: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ requireAuthAdmin: mocks.requireAuthAdmin }));
vi.mock("@/lib/db/queries", () => mocks);
import { POST } from "@/app/api/admin/announcements/route";
import { PATCH } from "@/app/api/admin/announcements/[id]/route";

const context = { params: Promise.resolve({ id: "1" }) };
const request = (body: object) => new Request("http://localhost/api/admin/announcements", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuthAdmin.mockResolvedValue({ user: { id: "admin" } });
  mocks.getTrackById.mockResolvedValue({ id: "song", isActive: true });
  mocks.getAnnouncementById.mockResolvedValue({ id: 1, actionType: "link", actionUrl: "https://example.com", actionLabel: "Open" });
  mocks.createAnnouncement.mockImplementation(async (data) => ({ id: 1, ...data }));
  mocks.updateAnnouncement.mockImplementation(async (id, data) => ({ id, ...data }));
});

describe("announcement action API", () => {
  it("requires admin authorization", async () => {
    mocks.requireAuthAdmin.mockResolvedValue(null);
    expect((await POST(request({}))).status).toBe(401);
    expect((await PATCH(request({}), context)).status).toBe(401);
    expect(mocks.createAnnouncement).not.toHaveBeenCalled();
  });
  it("persists a track action and rejects inactive tracks", async () => {
    const body = { title: "New", body: "<p>Song</p>", actionType: "track", actionTrackId: "song" };
    expect((await POST(request(body))).status).toBe(201);
    expect(mocks.createAnnouncement).toHaveBeenCalledWith(expect.objectContaining({ actionType: "track", actionTrackId: "song", actionUrl: null }));
    mocks.getTrackById.mockResolvedValue({ isActive: false });
    expect((await POST(request(body))).status).toBe(400);
  });
  it("preserves action settings on publish, supports partial edits, and clears a removed action", async () => {
    await PATCH(request({ publishedAt: "2026-09-29T12:00:00Z" }), context);
    expect(mocks.updateAnnouncement.mock.calls[0][1]).not.toHaveProperty("actionType");
    const response = await PATCH(request({ actionLabel: "Read More" }), context);
    expect(await response.json()).toMatchObject({ actionType: "link", actionLabel: "Read More", actionUrl: "https://example.com" });
    const cleared = await PATCH(request({ actionType: null }), context);
    expect(await cleared.json()).toMatchObject({ actionType: null, actionUrl: null, actionLabel: null });
  });
  it("rejects executable URLs without writing", async () => {
    expect((await PATCH(request({ actionUrl: "javascript:alert(1)" }), context)).status).toBe(400);
    expect(mocks.updateAnnouncement).not.toHaveBeenCalled();
  });
});
