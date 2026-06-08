---
name: hymnz-email
description: Compose, design, preview, test, and broadcast a HYMNZ newsletter to subscribers via Resend. Use when the user wants to send an email/newsletter/announcement to HYMNZ subscribers, draft a campaign, or update the default Resend template. Triggers include "email my subscribers", "send a newsletter", "announce X to subscribers", "compose a HYMNZ email".
---

# Hymnz Email

Guide the user from a one-line brief to a branded HYMNZ email sent to all
subscribers — with mandatory preview, test send, and explicit approval gates.

## Hard safety gates (never skip)

1. **Two separate approvals.** A test send and a broadcast are distinct
   approvals. Getting "looks good" on the preview authorizes the TEST send only.
   Never broadcast until the user, after seeing the test in their inbox,
   explicitly says to send to all subscribers.
2. **Confirm the recipient count.** Before broadcasting, run `count`, show the
   number, and have the user confirm that number in chat.
3. **Broadcast only with `--confirm`.** The CLI will not send to the segment
   without the `--confirm` flag. Pass it only after gate 1 and 2 are satisfied.

## Setup facts

- All commands run via tsx with secrets from `.env.local`:
  `npx tsx --env-file=.env.local scripts/hymnz-email.mjs <command> [args]`
- Branded shell + shared styles: `src/emails/HymnzShell.tsx` (source of truth).
- Campaigns live in `src/emails/campaigns/<slug>.tsx`. See `example.tsx`.
- Preview renders to `public/_email-preview.html`, viewable at
  `http://localhost:3333/_email-preview.html` (the dev server must be running).
- Test recipient: `hello@hymnz.com`. From: `EMAIL_FROM` env.

## Workflow

### 1. Compose & design
- Take the user's brief. Pick a short kebab-case `<slug>`.
- Create `src/emails/campaigns/<slug>.tsx`: a default-exported component wrapped
  in `<HymnzShell preview="...">`, body built from the shared `styles` object,
  plus an exported `subject`. Match the example's structure and the HYMNZ tone
  (sacred, warm, concise). Do not re-style the chrome — the shell owns branding.

### 2. Preview & iterate
- Run: `npx tsx --env-file=.env.local scripts/hymnz-email.mjs preview <slug>`
- Reload `http://localhost:3333/_email-preview.html` and screenshot it for the
  user. Check mobile width too. Iterate on copy/layout until the user approves
  the design. (This approval is for the TEST send only — see gate 1.)

### 3. Test send
- On approval, run: `... scripts/hymnz-email.mjs test <slug>`
- Tell the user to check `hello@hymnz.com`. Wait for them to report back.

### 4. Broadcast (gated)
- Only proceed if the user, after checking the inbox, explicitly approves
  sending to ALL subscribers.
- First run `... scripts/hymnz-email.mjs count` and show the subscriber count.
  Ask the user to confirm that number.
- After they confirm, send:
  - Immediately: `... scripts/hymnz-email.mjs broadcast <slug> --confirm`
  - Scheduled: add `--at <ISO8601>` (e.g. `--at 2026-06-10T14:00:00Z`)
- Report the broadcast id / scheduled time back.

### 5. Save default template (when asked)
- To refresh the reusable Resend draft used for autoresponders:
  `... scripts/hymnz-email.mjs save-template`
- This upserts a draft Broadcast named "HYMNZ — Default Template" built from the
  current Welcome layout. The user clones it for autoresponders in the Resend
  dashboard.

## Notes
- `public/_email-preview.html` is a throwaway artifact — do not commit it.
- Web fonts (Playfair) fall back to serif in most inbox clients; that's expected.
- If a command errors on a missing env var, confirm `--env-file=.env.local` is
  present in the command.
