# Admin users and survey reporting

`/admin/users` has three bookmarkable views:

- **Overview** (`?tab=overview`): subscription, device, and engagement metrics.
- **Active Users** (`?tab=active`): all registered accounts, name/email search, invitation form, and pending/past invitations. Click a user's name for top tracks and their original welcome-survey answers. Listening periods use the existing dashboard analytics.
- **Surveys** (`?tab=surveys`): participation, referral choices, question answer rates, submission counts over the last six UTC months, and Gemini insights.

Survey charts use the existing `onboarding_responses` table and onboarding fields on `users`. No new migration is required. Completed surveys take precedence over earlier dismissals. Optional blank answers are labeled as unanswered, and referral percentages include those blanks in the denominator. Text answers are saved only when the welcome survey is completed; dismissed drafts are not stored by the existing onboarding flow.

## Enable Gemini

Set `GEMINI_API_KEY` in `.env.local` for development and in the server's deployment environment for production. Never use a `NEXT_PUBLIC_` variable for the key. Restart the development server or redeploy after setting it.

`GEMINI_MODEL` optionally overrides the default `gemini-3.8-flash`. The integration uses Google's [generateContent REST API](https://ai.google.dev/api/generate-content); available model IDs are in the [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models).

Generate a summary with the question empty, or enter a specific question. Requests run only when the admin clicks the button. The endpoint independently checks admin authorization and reads survey data from the database. It sends aggregate counts from all responses plus up to 200 recent responses, capped at 250,000 characters of complete answers. The result displays the actual sample coverage. Account profile fields (name, email, ID) are omitted; text typed into survey answers is included. Summaries are displayed for the current visit and are not saved to the database.

The endpoint has a 45-second provider timeout and uses the existing best-effort per-process rate limiter (five requests per admin per minute). Missing configuration, quota limits, provider errors, blocked/incomplete output, and empty surveys have explicit UI states.

## Verification

Automated coverage lives in `src/lib/surveys/report.test.ts`, `src/app/api/admin/surveys/insights/route.test.ts`, and `src/components/admin/UsersManager.test.tsx`. Browser verification can use fictional data for search, navigation, charts, responsive layouts, and mocked summary output. A real Gemini request requires the configured server key.
