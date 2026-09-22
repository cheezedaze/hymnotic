import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeFeedback, FALLBACK_ACKNOWLEDGEMENT } from "./acknowledgement";
const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const answer = (text: string, finishReason = "STOP") => Response.json({ candidates: [{ finishReason, content: { parts: [{ text: "private reasoning", thought: true }, { text }] } }] });

describe("feedback acknowledgement", () => {
  it("sends the feedback as data and extracts only the visible complete answer", async () => {
    fetchMock.mockResolvedValue(answer("Thank you for sharing your thoughts about the library."));
    const response = await acknowledgeFeedback("The library could be easier to browse.");
    expect(response.responseSource).toBe("gemini");
    expect(response.acknowledgement).not.toContain("private reasoning");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.systemInstruction.parts[0].text).toContain("Never promise");
    expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({ feedback: "The library could be easier to browse." });
  });
  it.each(["We will fix this next week.", "We'll get back to you.", "We’re going to add that.", "I guarantee a refund.", "x".repeat(601)])("replaces an unsafe acknowledgement: %s", async (text) => {
    fetchMock.mockResolvedValue(answer(text));
    expect((await acknowledgeFeedback("feedback")).acknowledgement).toBe(FALLBACK_ACKNOWLEDGEMENT);
  });
  it("keeps feedback usable when Gemini fails or returns an incomplete answer", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await acknowledgeFeedback("feedback")).responseSource).toBe("fallback");
    fetchMock.mockResolvedValueOnce(answer("Partial", "MAX_TOKENS"));
    expect((await acknowledgeFeedback("feedback")).responseSource).toBe("fallback");
  });
});
