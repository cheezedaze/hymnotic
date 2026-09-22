# Admin track releases

## Production status

Production migration `0013_track_releases.sql` was applied on 2026-09-22.
`CRON_SECRET` is configured and the once-per-minute Vercel cron is enabled.
Do not apply the migration to production again; the steps below are retained for
new environments and disaster recovery.

New Track asks for a name and opens the editor. Choose the collection and upload
media there, then Save Track. New tracks are inactive. Duration is still detected
from audio for playback, but neither duration nor track number is editable.

The Release Track section supports an immediate release or a future local date
and time (the browser's time zone is shown). Announcement and push notification
are optional. The announcement uses the same rich text editor as Updates; its
image menu offers the track artwork, file upload, and image URL. Scheduling saves
the announcement and push content without publishing or sending anything yet.
Schedules can be edited or canceled until publication starts.

At release time the server checks the saved playback audio in S3, activates the
track, and replaces all published announcements with the release announcement in
one database transaction. If announcement is disabled, existing announcements are
left alone. A push goes to active device tokens after publication and is recorded
in Push Notifications. Later activation/deactivation never repeats the campaign.

## Deployment

1. Apply `drizzle/0013_track_releases.sql` once, before deploying this code, using
   the normal production database migration process. It preserves existing track
   visibility and marks existing tracks as previously released. New tracks default
   to inactive. Do not substitute `db:push` for this migration: it would omit the
   existing-track backfill. This repository's migration metadata is gitignored,
   so this standalone migration is intentionally applied directly:
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0013_track_releases.sql`.
2. Configure a strong random `CRON_SECRET` in the production environment. Keep the
   existing S3 and Firebase configuration. The S3 identity needs `s3:GetObject` on
   `audio/tracks/*` so HeadObject can verify files.
3. Deploy the source. `vercel.json` calls `/api/cron/track-releases` once per minute.
   Vercel supplies `Authorization: Bearer <CRON_SECRET>`. Minute-level cron requires
   a Vercel plan that supports it; otherwise use an external scheduler that calls
   the same endpoint every minute with the same authorization header.
4. Check the production cron execution logs. A release occurs on the first
   successful run at or after its timestamp, normally within a minute; it is not
   tied to an open admin page. Hosting outages can delay it.

See [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
and [cron usage limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Failure behavior

Missing/unverified audio prevents activation and announcement publication. Failed
scheduled releases retain their schedule and error for the next scheduler run.
The track list and editor display release errors. Repair the audio or cancel the
schedule if a delayed release is no longer appropriate.

The database serializes publication and atomically claims each push. Concurrent
scheduler calls cannot broadcast the same release twice. If Firebase delivery is
partial or uncertain, the track stays released and the editor shows a warning.
An interrupted push is flagged after ten minutes. Such attempts are not
broadcast again automatically because some devices may already have received
them; inspect Push Notifications and server logs before manually sending again.

## Verification

`npm test` includes release input/audio validation. For the database integration
suite, initialize a **disposable localhost database** with the current schema,
then run:

```sh
DATABASE_URL='postgresql://localhost/DISPOSABLE_DATABASE' npm run db:push
TRACK_RELEASE_TEST_DATABASE_URL='postgresql://localhost/DISPOSABLE_DATABASE' npx vitest run src/lib/tracks
```

The integration suite truncates its test tables, mocks S3/Firebase, and exercises
scheduling, cancellation, migration, failed uploads, concurrent processing,
announcement replacement, duplicate prevention, and later activation toggles.
It never falls back to the application's `DATABASE_URL`.
