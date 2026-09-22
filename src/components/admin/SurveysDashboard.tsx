"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { SurveyReport } from "@/lib/surveys/report";
import { BarStat, DonutChart } from "./charts/Charts";

interface Insights {
  text: string;
  model: string;
  generatedAt: string;
  responseCount: number;
  sampledResponses: number;
}

const colors = ["var(--color-accent)", "var(--color-gold)", "#60a5fa", "#c084fc", "#fb923c", "#f472b6", "#4ade80", "rgba(255,255,255,0.35)"];

export function SurveysDashboard({ report, aiConfigured }: { report: SurveyReport; aiConfigured: boolean }) {
  const [question, setQuestion] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const response = await fetch("/api/admin/surveys/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate insights. Please try again.");
      setInsights(data);
    } catch (error) {
      if (!request.signal.aborted) {
        setError(error instanceof Error ? error.message : "Could not generate insights. Please try again.");
      }
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };

  const peakMonth = Math.max(1, ...report.months.map((month) => month.count));
  const completionRate = report.totalUsers ? Math.round(report.completed / report.totalUsers * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold text-text-primary">What listeners are telling us</h2>
          <p className="text-sm text-text-muted mt-1">Welcome survey results across all registered users.</p>
        </div>
        <p className="text-sm text-text-secondary"><span className="font-semibold text-accent">{report.responseCount.toLocaleString()}</span> saved responses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-heavy rounded-xl p-5" aria-labelledby="survey-participation">
          <h3 id="survey-participation" className="text-sm font-semibold text-text-primary mb-4">Survey participation</h3>
          <DonutChart
            segments={[
              { label: "Completed", value: report.completed, color: "var(--color-accent)" },
              { label: "Dismissed · not completed", value: report.dismissed, color: "var(--color-gold)" },
              { label: "No response yet", value: report.notStarted, color: "rgba(255,255,255,0.22)" },
            ]}
            centerValue={`${completionRate}%`}
            centerLabel="completed"
          />
          <p className="text-xs text-text-muted mt-4">Of {report.totalUsers.toLocaleString()} registered users. Dismissed surveys can be completed later.</p>
        </section>

        <section className="glass-heavy rounded-xl p-5" aria-labelledby="survey-referrals">
          <h3 id="survey-referrals" className="text-sm font-semibold text-text-primary mb-1">How did you find us?</h3>
          <p className="text-xs text-text-muted mb-4">Selected referral sources · percentage of saved responses</p>
          <div className="space-y-3">
            {report.referrals.map((referral, index) => (
              <BarStat key={referral.label} label={referral.label} value={referral.count} total={report.responseCount} color={colors[index]} />
            ))}
          </div>
        </section>

        <section className="glass-heavy rounded-xl p-5" aria-labelledby="survey-answers">
          <h3 id="survey-answers" className="text-sm font-semibold text-text-primary mb-1">Questions answered</h3>
          <p className="text-xs text-text-muted mb-5">Survey questions are optional. Blank answers are excluded here.</p>
          <div className="space-y-5">
            {report.answers.map((answer) => (
              <BarStat key={answer.label} label={answer.label} value={answer.count} total={report.responseCount} />
            ))}
          </div>
        </section>

        <section className="glass-heavy rounded-xl p-5" aria-labelledby="survey-months">
          <h3 id="survey-months" className="text-sm font-semibold text-text-primary mb-1">Responses over time</h3>
          <p className="text-xs text-text-muted mb-4">Last six months · submission month in UTC</p>
          <div className="grid grid-cols-6 gap-2">
            {report.months.map((month) => (
              <div key={month.month} className="min-w-0 text-center">
                <div className="h-36 flex flex-col justify-end items-center gap-2">
                  <span className="text-xs text-text-secondary tabular-nums">{month.count}</span>
                  <div aria-hidden="true" className="w-full max-w-10 rounded-t bg-accent/70" style={{ height: `${month.count / peakMonth * 100}px`, minHeight: month.count ? 3 : 0 }} />
                </div>
                <p className="text-[10px] text-text-muted mt-2">{month.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {report.responseCount === 0 && (
        <p className="rounded-xl border border-white/10 p-4 text-sm text-text-muted">No survey responses yet. Charts and insights will fill in as listeners complete the welcome survey.</p>
      )}

      <section className="glass-heavy rounded-xl p-5 border border-accent/20" aria-labelledby="survey-insights">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-accent" />
          <h3 id="survey-insights" className="text-sm font-semibold text-text-primary">Listener insights</h3>
          <span className="text-[10px] uppercase tracking-wider text-text-muted ml-auto">Gemini</span>
        </div>
        <p className="text-sm text-text-muted mb-4">Summarize music preferences, discover recurring hymn requests, or ask a question about the responses.</p>
        {!aiConfigured && (
          <p className="text-sm text-gold mb-4">AI insights are not configured yet. Add GEMINI_API_KEY to the server environment to enable them.</p>
        )}
        <form onSubmit={generate} className="space-y-3">
          <label htmlFor="survey-question" className="block text-xs font-medium text-text-secondary">Question (optional)</label>
          <textarea
            id="survey-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which hymns and music styles should we prioritize next?"
            maxLength={1000}
            rows={2}
            disabled={loading || !aiConfigured || report.responseCount === 0}
            className="w-full px-3 py-2 rounded-lg text-sm text-text-primary placeholder:text-text-dim bg-white/5 border border-white/10 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 disabled:opacity-50"
          />
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-text-muted max-w-xl">Uses survey answers and aggregate counts. Account names, emails, and IDs are excluded from the AI request.</p>
            <button type="submit" disabled={loading || !aiConfigured || report.responseCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 border border-accent/25 text-accent text-sm font-medium hover:bg-accent/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Analyzing responses…" : question.trim() ? "Ask Gemini" : "Generate summary"}
            </button>
          </div>
        </form>
        <div aria-live="polite" aria-busy={loading}>
          {error && <p role="alert" className="text-sm text-red-400 mt-4">{error}</p>}
          {insights && (
            <div className="border-t border-white/10 mt-5 pt-5">
              <p className="text-xs text-text-muted mb-3">
                Counts from all {insights.responseCount.toLocaleString()} responses · {insights.sampledResponses < insights.responseCount ? `Text sampled from the ${insights.sampledResponses} most recent responses` : `All ${insights.sampledResponses} text responses analyzed`} · {new Date(insights.generatedAt).toLocaleString()}
              </p>
              <div className="whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary">{insights.text}</div>
              <p className="text-xs text-text-dim mt-4">AI-generated interpretation. Review individual survey answers before acting on recommendations.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
