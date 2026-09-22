import { referralLabel } from "@/lib/surveys/report";
import type { SurveyResponse } from "@/lib/surveys/report";

export function UserSurvey({ response, completedAt, dismissedAt, dismissCount }: {
  response: SurveyResponse | null;
  completedAt: Date | null;
  dismissedAt: Date | null;
  dismissCount: number;
}) {
  const completed = response?.completedAt ?? completedAt;
  const answers = response ? [
    { label: "How did you find us?", value: referralLabel(response.referralSource) },
    { label: "Referral details", value: response.referralDetail },
    { label: "Favorite music, genres, and artists", value: response.favoriteMusic },
    { label: "Favorite hymns", value: response.favoriteHymns },
  ] : [];

  return (
    <section className="glass-heavy rounded-xl p-5" aria-labelledby="user-survey-heading">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h2 id="user-survey-heading" className="text-sm font-semibold text-text-primary">Welcome survey</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${completed ? "bg-accent/10 text-accent" : "bg-white/5 text-text-muted"}`}>
          {completed ? "Completed" : dismissedAt || dismissCount > 0 ? "Dismissed" : "Not completed"}
        </span>
      </div>
      {completed && <p className="text-xs text-text-muted mb-4">Completed {completed.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "long" })}</p>}
      {response ? (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {answers.map((answer) => (
            <div key={answer.label} className="min-w-0">
              <dt className="text-xs font-medium text-text-muted mb-2">{answer.label}</dt>
              <dd className="text-sm text-text-primary whitespace-pre-wrap break-words leading-6">{answer.value?.trim() || "Not answered"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-text-muted mt-3">{completed
          ? "This user completed onboarding, but no saved survey answers are available."
          : "No answers have been submitted yet. Answers are saved when the user completes the survey."}</p>
      )}
      {(dismissCount > 0 || dismissedAt) && (
        <p className="text-xs text-text-muted mt-4">Dismissed {dismissCount} {dismissCount === 1 ? "time" : "times"}{dismissedAt ? ` · Last dismissed ${dismissedAt.toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "long" })}` : ""}</p>
      )}
    </section>
  );
}
