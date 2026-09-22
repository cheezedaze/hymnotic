export const REFERRAL_SOURCES: Record<string, string> = {
  friend: "Friend / Family",
  search: "Search",
  social: "Social Media",
  podcast: "Podcast",
  church: "Church",
  appstore: "App Store",
  other: "Other",
};

export function referralLabel(source: string | null) {
  return source ? REFERRAL_SOURCES[source] ?? "Other" : "Not answered";
}

export interface SurveyResponse {
  userId: string;
  referralSource: string | null;
  referralDetail: string | null;
  favoriteMusic: string | null;
  favoriteHymns: string | null;
  completedAt: Date;
}

interface SurveyUser {
  id: string;
  onboardingCompletedAt: Date | null;
  onboardingLastDismissedAt: Date | null;
  onboardingDismissCount: number;
}

export function buildSurveyReport(
  users: SurveyUser[],
  responses: SurveyResponse[],
  now = new Date()
) {
  const respondentIds = new Set(responses.map((response) => response.userId));
  let completed = 0;
  let dismissed = 0;
  for (const user of users) {
    if (user.onboardingCompletedAt || respondentIds.has(user.id)) completed++;
    else if (user.onboardingDismissCount > 0 || user.onboardingLastDismissedAt) dismissed++;
  }

  const referralCounts = new Map(
    [...Object.values(REFERRAL_SOURCES), "Not answered"].map((label) => [label, 0])
  );
  for (const response of responses) {
    const label = referralLabel(response.referralSource);
    referralCounts.set(label, (referralCounts.get(label) ?? 0) + 1);
  }

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    return {
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
      count: 0,
    };
  });
  for (const response of responses) {
    const month = months.find((entry) => entry.month === response.completedAt.toISOString().slice(0, 7));
    if (month) month.count++;
  }

  const fields = [
    { key: "referralSource", label: "Referral source" },
    { key: "referralDetail", label: "Referral details" },
    { key: "favoriteMusic", label: "Favorite music / artists" },
    { key: "favoriteHymns", label: "Favorite hymns" },
  ] as const;

  return {
    totalUsers: users.length,
    completed,
    dismissed,
    notStarted: users.length - completed - dismissed,
    responseCount: responses.length,
    referrals: [...referralCounts].map(([label, count]) => ({ label, count })),
    answers: fields.map(({ key, label }) => ({
      label,
      count: responses.filter((response) => response[key]?.trim()).length,
    })),
    months,
  };
}

export type SurveyReport = ReturnType<typeof buildSurveyReport>;

// Bound the AI request size while retaining complete answers. Aggregate charts
// always use all responses; the UI and prompt disclose the recent text sample.
export function sampleSurveyAnswers(responses: SurveyResponse[]) {
  const answers: Omit<SurveyResponse, "userId" | "completedAt">[] = [];
  let characters = 0;
  const recent = [...responses].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  for (const response of recent) {
    const answer = {
      referralSource: response.referralSource,
      referralDetail: response.referralDetail,
      favoriteMusic: response.favoriteMusic,
      favoriteHymns: response.favoriteHymns,
    };
    const length = JSON.stringify(answer).length;
    if (answers.length >= 200 || characters + length > 250_000) break;
    answers.push(answer);
    characters += length;
  }
  return answers;
}
