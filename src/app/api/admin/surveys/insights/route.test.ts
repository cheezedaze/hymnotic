import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthAdmin: vi.fn(), getSurveyUsers: vi.fn(), getSurveyResponses: vi.fn(), isRateLimited: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ requireAuthAdmin: mocks.requireAuthAdmin }));
vi.mock("@/lib/surveys/queries", () => mocks);
vi.mock("@/lib/security/rate-limit", () => ({ isRateLimited: mocks.isRateLimited }));
import { POST } from "./route";

const fetchMock = vi.fn();
const request = (body: unknown = {}) => new Request("http://localhost/api/admin/surveys/insights", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
const date = new Date("2026-09-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-secret");
  vi.stubEnv("GEMINI_MODEL", "test-model");
  vi.stubGlobal("fetch", fetchMock);
  mocks.requireAuthAdmin.mockResolvedValue({ user: { id: "admin" } });
  mocks.isRateLimited.mockReturnValue(false);
  mocks.getSurveyUsers.mockResolvedValue([{
    id: "private-user", onboardingCompletedAt: date, onboardingLastDismissedAt: null, onboardingDismissCount: 0,
    email: "private@example.com", name: "Private Name",
  }]);
  mocks.getSurveyResponses.mockResolvedValue([{
    userId: "private-user", referralSource: "friend", referralDetail: null,
    favoriteMusic: "Gospel", favoriteHymns: "Be Thou My Vision", completedAt: date,
  }]);
  fetchMock.mockResolvedValue(Response.json({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Listeners mentioned gospel." }] } }],
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("admin survey insights", () => {
  it("blocks unauthorized callers before reading survey data or contacting Gemini", async () => {
    mocks.requireAuthAdmin.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.getSurveyResponses).not.toHaveBeenCalled();
    expect(mocks.getSurveyUsers).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, [], { question: 1 }, { question: "x".repeat(1001) }])("rejects malformed input: %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing configuration without exposing data", async () => {
    vi.stubEnv("GEMINI_API_KEY", " ");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("GEMINI_API_KEY");
    expect(mocks.getSurveyResponses).not.toHaveBeenCalled();
  });

  it("limits repeated generation requests", async () => {
    mocks.isRateLimited.mockReturnValue(true);
    expect((await POST(request())).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not spend API usage on an empty survey", async () => {
    mocks.getSurveyResponses.mockResolvedValue([]);
    expect((await POST(request())).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses server-side answers, excludes account identity, and returns sample coverage", async () => {
    const response = await POST(request({ question: "What music is requested?", answers: ["invented client data"] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const result = await response.json();
    expect(result).toMatchObject({ text: "Listeners mentioned gospel.", model: "test-model", responseCount: 1, sampledResponses: 1 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent");
    expect(url).not.toContain("test-secret");
    expect(options.headers["x-goog-api-key"]).toBe("test-secret");
    expect(options.body).toContain("Be Thou My Vision");
    expect(options.body).toContain("What music is requested?");
    for (const privateValue of ["private-user", "private@example.com", "Private Name", "invented client data"]) {
      expect(options.body).not.toContain(privateValue);
    }
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it.each([400, 403, 404, 429, 500])("handles Gemini HTTP %s without forwarding provider details", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ error: { message: "sensitive provider details" } }, { status }));
    const response = await POST(request());
    expect(response.status).toBe(status === 429 ? 429 : 502);
    expect((await response.json()).error).not.toContain("sensitive provider details");
  });

  it.each(["SAFETY", "MAX_TOKENS"])("rejects incomplete or blocked output (%s)", async (finishReason) => {
    fetchMock.mockResolvedValue(Response.json({ candidates: [{ finishReason, content: { parts: [{ text: "partial" }] } }] }));
    expect((await POST(request())).status).toBe(502);
  });

  it("does not display thought content as the summary", async () => {
    fetchMock.mockResolvedValue(Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [
      { thought: true, text: "internal thinking" }, { text: "Final summary" },
    ] } }] }));
    expect((await (await POST(request())).json()).text).toBe("Final summary");
  });

  it("reports request timeouts", async () => {
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    expect((await POST(request())).status).toBe(504);
  });
});
