import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTrackById: vi.fn(), getTracksByIds: vi.fn(), getCollectionById: vi.fn(),
  getAccessContext: vi.fn(), signAudioUrl: vi.fn(),
}));
vi.mock("@/lib/db/queries", () => ({ ...mocks, grantFreeListen: vi.fn() }));
vi.mock("@/lib/auth/access", () => ({
  getAccessContext: mocks.getAccessContext,
  getSacred7TrackIds: vi.fn().mockResolvedValue([]),
  canPlayFullTrack: vi.fn().mockReturnValue(true),
  getPreviewDuration: vi.fn().mockReturnValue(30),
}));
vi.mock("@/lib/s3/client", () => ({
  signAudioUrl: mocks.signAudioUrl,
  getObjectRange: vi.fn(),
  buildTrackMediaUrlsWithFallback: vi.fn().mockReturnValue({}),
}));
import { GET as audio } from "@/app/api/tracks/[id]/audio/route";
import { GET as metadata } from "@/app/api/tracks/[id]/route";
import { POST as batch } from "@/app/api/tracks/batch/route";

const request = new Request("http://localhost/api/tracks/draft");
const context = { params: Promise.resolve({ id: "draft" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTrackById.mockResolvedValue({ id: "draft", audioKey: "audio/tracks/draft.mp3", isActive: false });
  mocks.getAccessContext.mockResolvedValue({ tier: "paid", isAdmin: false });
  mocks.signAudioUrl.mockReturnValue("https://example.test/signed-audio");
});

describe("unreleased track visibility", () => {
  it("blocks direct audio access even for paid listeners", async () => {
    expect((await audio(request, context)).status).toBe(404);
    expect(mocks.signAudioUrl).not.toHaveBeenCalled();
  });
  it("allows admins to preview unreleased audio", async () => {
    mocks.getAccessContext.mockResolvedValue({ tier: "paid", isAdmin: true });
    expect((await audio(request, context)).status).toBe(302);
  });
  it("hides draft metadata from public requests", async () => {
    expect((await metadata(request, context)).status).toBe(404);
  });
  it("filters inactive tracks out of batch responses", async () => {
    mocks.getTracksByIds.mockResolvedValue([{ id: "draft", isActive: false }, { id: "released", isActive: true, collectionId: "collection" }]);
    const response = await batch(new Request("http://localhost/api/tracks/batch", { method: "POST", body: JSON.stringify({ ids: ["draft", "released"] }) }));
    expect((await response.json()).map((track: { id: string }) => track.id)).toEqual(["released"]);
  });
});
