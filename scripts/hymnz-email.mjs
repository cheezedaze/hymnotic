/**
 * HYMNZ email CLI — drives the "Hymnz Email" skill workflow.
 *
 * Run with tsx so it can import .tsx campaign modules, and load secrets from
 * .env.local via Node's --env-file flag:
 *
 *   npx tsx --env-file=.env.local scripts/hymnz-email.mjs <command> [args]
 *
 * Commands:
 *   preview <slug>              Render campaign -> public/_email-preview.html
 *   count                       Show how many contacts are in the segment
 *   test <slug>                 Send ONE test email to hello@hymnz.com
 *   broadcast <slug> --confirm  Create + send a broadcast to the whole segment
 *       [--at <ISO8601>]        ...optionally scheduled instead of immediate
 *   save-template               Upsert the "HYMNZ — Default Template" draft
 *
 * The --confirm flag on `broadcast` is a hard guard: without it the command
 * prints what it WOULD do and exits without sending. The skill never passes
 * --confirm until the user has explicitly approved the mass send in chat.
 */
import { render } from "@react-email/components";
import { Resend } from "resend";
import React from "react";
import { writeFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const TEST_RECIPIENT = "hello@hymnz.com";
const TEMPLATE_NAME = "HYMNZ — Default Template";
const PREVIEW_PATH = "public/_email-preview.html";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set (need --env-file=.env.local)");
  return new Resend(apiKey);
}

function getAudienceId() {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) throw new Error("RESEND_AUDIENCE_ID is not set (need --env-file=.env.local)");
  return id;
}

function defaultFrom() {
  return process.env.EMAIL_FROM || "HYMNZ <onboarding@resend.dev>";
}

// Load a campaign module from src/emails/campaigns/<slug>.tsx.
// Returns { Component, subject, from }.
async function loadCampaign(slug) {
  if (!slug) throw new Error("Missing campaign slug");
  const file = path.resolve("src/emails/campaigns", `${slug}.tsx`);
  const mod = await import(pathToFileURL(file).href);
  const Component = mod.default?.default ?? mod.default;
  if (typeof Component !== "function") {
    throw new Error(`Campaign ${slug} has no default-exported component`);
  }
  return {
    Component,
    subject: mod.subject ?? `HYMNZ`,
    from: mod.from ?? defaultFrom(),
  };
}

async function renderCampaign(slug) {
  const { Component, subject, from } = await loadCampaign(slug);
  const html = await render(React.createElement(Component));
  return { html, subject, from };
}

async function cmdPreview(slug) {
  const { html } = await renderCampaign(slug);
  writeFileSync(PREVIEW_PATH, html);
  console.log(`Wrote ${PREVIEW_PATH} (${html.length} bytes)`);
  console.log(`Preview at: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333"}/_email-preview.html`);
}

async function cmdCount() {
  const resend = getResend();
  const audienceId = getAudienceId();
  const { data, error } = await resend.contacts.list({ audienceId });
  if (error) throw new Error(`contacts.list failed: ${JSON.stringify(error)}`);
  const contacts = data?.data ?? [];
  const subscribed = contacts.filter((c) => !c.unsubscribed);
  console.log(`Segment ${audienceId}: ${contacts.length} contacts, ${subscribed.length} subscribed`);
  return subscribed.length;
}

// Resend resolves merge tags like {{{FIRST_NAME|fallback}}} only in broadcasts,
// not in transactional test sends. For tests, substitute them locally so the
// personalized result is visible — using --name when given, else the fallback.
function resolveMergeTags(html, name) {
  return html.replace(
    /\{\{\{FIRST_NAME(?:\|([^}]*))?\}\}\}/g,
    (_m, fallback) => name || fallback || "there",
  );
}

async function cmdTest(slug, opts = {}) {
  const recipient = opts.to || TEST_RECIPIENT;
  const { html: rawHtml, subject, from } = await renderCampaign(slug);
  const html = resolveMergeTags(rawHtml, opts.name);
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from,
    to: recipient,
    subject: `[TEST] ${subject}`,
    html,
  });
  if (error) throw new Error(`Test send failed: ${JSON.stringify(error)}`);
  console.log(`Test sent to ${recipient} (id: ${data?.id})`);
}

async function cmdBroadcast(slug, opts) {
  const { html, subject, from } = await renderCampaign(slug);
  const resend = getResend();
  const audienceId = getAudienceId();

  if (!opts.confirm) {
    const n = await cmdCount();
    console.log(`\nDRY RUN — would broadcast "${subject}" to ${n} subscribers.`);
    console.log(`Re-run with --confirm to actually send.`);
    return;
  }

  const { data: created, error: createErr } = await resend.broadcasts.create({
    audienceId,
    from,
    subject,
    html,
    name: subject,
  });
  if (createErr) throw new Error(`broadcasts.create failed: ${JSON.stringify(createErr)}`);
  const broadcastId = created?.id;
  console.log(`Broadcast created (id: ${broadcastId})`);

  const sendArgs = { broadcastId };
  if (opts.at) sendArgs.scheduledAt = opts.at;
  const { error: sendErr } = await resend.broadcasts.send(sendArgs);
  if (sendErr) throw new Error(`broadcasts.send failed: ${JSON.stringify(sendErr)}`);
  console.log(opts.at ? `Broadcast scheduled for ${opts.at}` : `Broadcast sent to the segment`);
}

// Upsert a reusable draft broadcast that can be cloned for autoresponders in
// the Resend dashboard. Built from the Welcome email's rendered shell so the
// stored default always matches the live brand layout.
async function cmdSaveTemplate() {
  const resend = getResend();
  const audienceId = getAudienceId();
  const { default: Welcome } = await import(
    pathToFileURL(path.resolve("src/emails/Welcome.tsx")).href
  );
  const Component = Welcome.default ?? Welcome;
  const html = await render(React.createElement(Component, { name: "{{{FIRST_NAME|there}}}" }));

  const { data: list } = await resend.broadcasts.list();
  const existing = (list?.data ?? []).find((b) => b.name === TEMPLATE_NAME);

  if (existing) {
    const { error } = await resend.broadcasts.update({
      id: existing.id,
      html,
      subject: TEMPLATE_NAME,
    });
    if (error) throw new Error(`broadcasts.update failed: ${JSON.stringify(error)}`);
    console.log(`Updated default template draft (id: ${existing.id})`);
  } else {
    const { data, error } = await resend.broadcasts.create({
      audienceId,
      from: defaultFrom(),
      subject: TEMPLATE_NAME,
      name: TEMPLATE_NAME,
      html,
    });
    if (error) throw new Error(`broadcasts.create failed: ${JSON.stringify(error)}`);
    console.log(`Created default template draft (id: ${data?.id})`);
  }
}

function parseFlags(argv) {
  const opts = { confirm: false, at: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--confirm") opts.confirm = true;
    else if (argv[i] === "--at") opts.at = argv[++i];
    else if (argv[i] === "--to") opts.to = argv[++i];
    else if (argv[i] === "--name") opts.name = argv[++i];
  }
  return opts;
}

const [, , command, ...rest] = process.argv;
const slug = rest.find((a) => !a.startsWith("--"));
const opts = parseFlags(rest);

const commands = {
  preview: () => cmdPreview(slug),
  count: () => cmdCount(),
  test: () => cmdTest(slug, opts),
  broadcast: () => cmdBroadcast(slug, opts),
  "save-template": () => cmdSaveTemplate(),
};

const run = commands[command];
if (!run) {
  console.error(`Unknown command: ${command ?? "(none)"}`);
  console.error(`Commands: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
