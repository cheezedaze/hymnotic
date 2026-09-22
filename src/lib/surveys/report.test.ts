import { describe, expect, it } from "vitest";
import { buildSurveyReport, sampleSurveyAnswers, type SurveyResponse } from "./report";

const now = new Date("2026-01-15T12:00:00Z");
const user = (id: string, dismissCount = 0, completedAt: Date | null = null) => ({
  id, onboardingCompletedAt: completedAt,
  onboardingLastDismissedAt: dismissCount ? now : null,
  onboardingDismissCount: dismissCount,
});
const response = (userId: string, fields: Partial<SurveyResponse> = {}): SurveyResponse => ({
  userId, referralSource: null, referralDetail: null, favoriteMusic: null,
  favoriteHymns: null, completedAt: now, ...fields,
});

describe("survey reporting", () => {
  it("counts completion after dismissal once, including saved answers before the completion flag", () => {
    const report = buildSurveyReport(
      [user("finished", 2, now), user("saved", 1), user("later", 3), user("new")],
      [response("finished"), response("saved")], now
    );
    expect([report.completed, report.dismissed, report.notStarted]).toEqual([2, 1, 1]);
    expect(report.completed + report.dismissed + report.notStarted).toBe(report.totalUsers);
    expect(report.responseCount).toBe(2);
  });

  it("includes skipped referral choices but excludes blank optional text from answer rates", () => {
    const report = buildSurveyReport([user("one"), user("two"), user("three")], [
      response("one", { referralSource: "friend", favoriteMusic: "gospel", favoriteHymns: "  " }),
      response("two", { referralSource: "future-source", favoriteHymns: "Be Thou My Vision" }),
      response("three"),
    ], now);
    expect(report.referrals.find((item) => item.label === "Friend / Family")?.count).toBe(1);
    expect(report.referrals.find((item) => item.label === "Other")?.count).toBe(1);
    expect(report.referrals.find((item) => item.label === "Not answered")?.count).toBe(1);
    expect(report.referrals.reduce((sum, item) => sum + item.count, 0)).toBe(3);
    expect(report.answers.map((item) => item.count)).toEqual([2, 0, 1, 1]);
  });

  it("fills empty months across a year boundary and uses UTC submission dates", () => {
    const report = buildSurveyReport([], [
      response("old", { completedAt: new Date("2025-07-31T23:59:59Z") }),
      response("august", { completedAt: new Date("2025-08-01T00:00:00Z") }),
      response("january", { completedAt: new Date("2025-12-31T23:30:00-07:00") }),
    ], now);
    expect(report.months.map((month) => [month.month, month.count])).toEqual([
      ["2025-08", 1], ["2025-09", 0], ["2025-10", 0], ["2025-11", 0], ["2025-12", 0], ["2026-01", 1],
    ]);
  });

  it("handles no users or responses", () => {
    const report = buildSurveyReport([], [], now);
    expect([report.totalUsers, report.completed, report.dismissed, report.notStarted, report.responseCount]).toEqual([0, 0, 0, 0, 0]);
    expect(report.answers.every((item) => item.count === 0)).toBe(true);
  });

  it("bounds AI input and removes account identifiers while keeping complete recent answers", () => {
    const responses = Array.from({ length: 250 }, (_, index) => response(`private-id-${index}`, {
      favoriteMusic: "music ".repeat(300), favoriteHymns: "hymns ".repeat(300),
      completedAt: new Date(now.getTime() + index * 1000),
    }));
    const sample = sampleSurveyAnswers(responses);
    expect(sample.length).toBeGreaterThan(0);
    expect(sample.length).toBeLessThan(200);
    expect(sample.reduce((size, answer) => size + JSON.stringify(answer).length, 0)).toBeLessThanOrEqual(250_000);
    expect(sample[0].favoriteMusic).toBe(responses[249].favoriteMusic);
    expect(JSON.stringify(sample)).not.toContain("private-id");
    expect(sample[0]).not.toHaveProperty("completedAt");
    expect(responses[0].userId).toBe("private-id-0");
  });

  it("uses at most 200 recent responses", () => {
    const responses = Array.from({ length: 210 }, (_, index) => response(String(index), {
      referralDetail: `answer ${index}`, completedAt: new Date(now.getTime() + index * 1000),
    }));
    const sample = sampleSurveyAnswers(responses);
    expect(sample).toHaveLength(200);
    expect(sample[0].referralDetail).toBe("answer 209");
    expect(sample[199].referralDetail).toBe("answer 10");
  });
});
