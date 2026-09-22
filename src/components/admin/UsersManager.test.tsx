import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { UsersManager } from "./UsersManager";
import { UserSurvey } from "./UserSurvey";
import { SurveysDashboard } from "./SurveysDashboard";
import { buildSurveyReport } from "@/lib/surveys/report";

const user = {
  id: "listener", email: "listener@example.com", name: "Listener", role: "USER",
  isPremium: false, manualPremium: false, accountTier: "free", newsletterOptIn: false,
  pushEnabled: false, platforms: [], createdAt: "2026-09-01T00:00:00Z",
};
const stats = {
  total: 1, iosCount: 0, androidCount: 0, webOnlyCount: 1, newsletterCount: 0,
  pushCount: 0, premiumCount: 0, freeCount: 1, paidCount: 0, trialingCount: 0,
  pastDueCount: 0, compedCount: 0, totalDevices: 0, anonymousDevices: 0,
};
const renderTab = (tab: "overview" | "active" | "surveys") => renderToStaticMarkup(
  <UsersManager tab={tab} users={[user]} stats={stats} invitations={[
    { id: 1, email: "invite@example.com", createdAt: "2026-01-01", usedAt: null, expiresAt: "2099-01-01" },
  ]} surveys={<div>Survey reporting</div>} />
);

describe("user administration views", () => {
  it("keeps account metrics on Overview and invitation management on Active Users", () => {
    const overview = renderTab("overview");
    expect(overview).toContain("Subscriptions");
    expect(overview).not.toContain("Invite User");
    expect(overview).not.toContain("invite@example.com");
    const active = renderTab("active");
    expect(active).toContain("Invite User");
    expect(active).toContain("invite@example.com");
    expect(active).toContain('href="/admin/users/listener/stats"');
    expect(active).toContain("Search users by name or email");
    expect(active).not.toContain("Subscriptions");
  });

  it("keeps Surveys independently addressable", () => {
    const html = renderTab("surveys");
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/admin\/users\?tab=surveys"/);
    expect(html).toContain("Survey reporting");
    expect(html).not.toContain("Invite User");
    expect(html).not.toContain("listener@example.com");
  });

  it("shows the original answers as escaped text, with skipped fields labeled", () => {
    const html = renderToStaticMarkup(<UserSurvey response={{
      userId: "listener", referralSource: "social", referralDetail: "<script>alert(1)</script>",
      favoriteMusic: "Gospel", favoriteHymns: null, completedAt: new Date("2026-09-01T00:00:00Z"),
    }} completedAt={null} dismissedAt={null} dismissCount={0} />);
    expect(html).toContain("Social Media");
    expect(html).toContain("Gospel");
    expect(html).toContain("Not answered");
    expect(html).toContain("Completed");
    expect(html).not.toContain("<script>");
  });

  it("distinguishes a dismissed survey from a submitted one", () => {
    const html = renderToStaticMarkup(<UserSurvey response={null} completedAt={null} dismissedAt={new Date("2026-09-01T00:00:00Z")} dismissCount={2} />);
    expect(html).toContain("Dismissed 2 times");
    expect(html).toContain("No answers have been submitted yet");
    expect(html).not.toContain("Favorite hymns");
  });

  it("shows empty charts and explains why AI is unavailable", () => {
    const html = renderToStaticMarkup(<SurveysDashboard report={buildSurveyReport([], [])} aiConfigured={false} />);
    expect(html).toContain("No survey responses yet");
    expect(html).toContain("GEMINI_API_KEY");
    expect(html).toContain('type="submit" disabled=""');
    expect(html).not.toContain("NaN");
  });
});
