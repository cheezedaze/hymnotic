import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireAuthAdmin: vi.fn(), scheduleTrackRelease: vi.fn(), processTrackRelease: vi.fn(),
  getTrackRelease: vi.fn(), cancelTrackRelease: vi.fn(), processDueTrackReleases: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ requireAuthAdmin: mocks.requireAuthAdmin }));
vi.mock("@/lib/tracks/releases", () => mocks);
import { GET as cron } from "@/app/api/cron/track-releases/route";
import { GET, POST, DELETE } from "@/app/api/admin/tracks/[id]/release/route";
const context = { params: Promise.resolve({ id: "track" }) };

beforeEach(() => { vi.clearAllMocks(); mocks.requireAuthAdmin.mockResolvedValue(null); });
afterEach(() => vi.unstubAllEnvs());

describe("release endpoint authorization", () => {
  it("requires admin access for reading, scheduling, and canceling", async () => {
    const request = new Request("http://localhost/api/admin/tracks/track/release");
    for (const handler of [GET, POST, DELETE]) expect((await handler(request, context)).status).toBe(401);
    expect(mocks.scheduleTrackRelease).not.toHaveBeenCalled();
    expect(mocks.cancelTrackRelease).not.toHaveBeenCalled();
    expect(mocks.getTrackRelease).not.toHaveBeenCalled();
  });
  it("rejects cron when unconfigured or given the wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await cron(new Request("http://localhost/api/cron/track-releases"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect((await cron(new Request("http://localhost/api/cron/track-releases", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
    expect(mocks.processDueTrackReleases).not.toHaveBeenCalled();
  });
  it("processes due releases only with the scheduler secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    mocks.processDueTrackReleases.mockResolvedValue([{ trackId: "track", status: "completed" }]);
    const response = await cron(new Request("http://localhost/api/cron/track-releases", { headers: { authorization: "Bearer test-secret" } }));
    expect(response.status).toBe(200);
    expect(mocks.processDueTrackReleases).toHaveBeenCalledTimes(1);
  });
});
