# Feedback, newsletter sync, and update history

## Production rollout — 2026-09-22

Deployed to https://www.hymnz.com using Vercel deployment
`hymnotic-69t2ztelc-winks-2dcbd5ea.vercel.app`. Production build and TypeScript
checks passed. Live checks confirmed the visitor form gate, nine update-history
entries, and 401 responses from protected feedback/admin APIs.

Applied `drizzle/0014_feedback_and_update_history.sql` to production. Do not apply
it again. Existing records were retained: all nine announcements were restored to
history, including eight with approximate dates derived from their earliest
recorded dismissal because the old release flow had erased publication dates.
New publications retain their original date even after a later release replaces
them. Never-published drafts and future publications are excluded from history;
deleting an announcement removes it from history.

The missing production `RESEND_SEGMENT_ID` was configured using the verified
HYMNZ Newsletter segment. All 16 confirmed database opt-ins were reconciled
successfully. Sync does not send campaigns or confirmation emails. Unconfirmed
registrations are not newsletter subscribers. Existing Resend unsubscribes stay
unsubscribed during bulk reconciliation; only a fresh explicit opt-in can reverse
them. `RESEND_AUDIENCE_ID` remains a fallback for existing environments.

Admin sync uses small resumable pages, request pacing, transient-error retries,
and actionable configuration errors. The Resend key needs full Contacts/Segments
access. Newsletter confirmation email API failures are now reported in server logs.

## Feedback

On `/about`, registered accounts (including free accounts) can send up to three
messages per hour, enforced transactionally in PostgreSQL. Visitors see registration,
sign-in, and social links. The form accepts up to 3,000 characters. Submission IDs
prevent duplicate records and notifications when the same request is retried.

Only the submitted message is sent to Gemini. Account identity is not added to the
prompt. `GEMINI_API_KEY` and optional `GEMINI_MODEL` use the existing survey-insights
configuration. The acknowledgement is stored with the message. API failures,
incomplete output, and detected commitment language use a neutral fallback.

The optional follow-up checkbox uses the account's email and is separate from
newsletter consent. Without consent, the feedback record has no contact email and
the admin reply API rejects email replies.

`/admin/feedback`, under Engagement, shows the original message, acknowledgement,
consent, notification statuses, and saved email replies. Replies go through Resend;
recipient addresses come from the saved consent record, never client input.
Retry the same saved reply after an uncertain delivery. Resend idempotency keys
protect retries for 24 hours; attempts older than 23 hours are blocked for manual
review in Resend before sending a new reply. Replies to those emails arrive at
hello@hymnz.com; inbound email is not imported into the inbox.

Each submission sends an email alert to hello@hymnz.com and attempts a private FCM
push only to active devices attached to the ADMIN user admin@hymnotic.app. There is no
broadcast fallback. No admin device was registered at rollout: open Engagement →
Feedback in the HYMNZ iOS/Android app as that account and select **Enable feedback
notifications**. Firebase permissions and an active device token are required.
Notification failures do not discard feedback and are visible in the inbox.

## Verification

- Unit tests cover Resend configuration, contact creation, rate limits, unsubscribe
  preservation, and constrained/fallback Gemini acknowledgements.
- Integration tests use only `FEEDBACK_TEST_DATABASE_URL`, require localhost, and
  cover auth, validation, consent, concurrent rate limiting, replay protection,
  email reply retries, private push targeting, migration, and history pagination.
- Run against a disposable database initialized with the schema:
  `FEEDBACK_TEST_DATABASE_URL=postgresql://...localhost... npm test -- src/lib/feedback/feedback.integration.test.ts`
- Browser checks covered visitor/free-account feedback, optional consent, saved
  acknowledgements, the admin inbox, and 45 history entries loaded as 20/20/5.
