BEGIN;

ALTER TABLE tracks ALTER COLUMN is_active SET DEFAULT false;
-- Existing tracks keep the ordinary activation controls. Only new tracks need
-- the first-release workflow; this does not change anyone's visibility.
UPDATE tracks SET published_at = created_at WHERE published_at IS NULL;

CREATE TABLE track_releases (
  track_id varchar(128) PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  announcement_title text,
  announcement_body text,
  push_title text,
  push_body text,
  status varchar(24) NOT NULL DEFAULT 'scheduled',
  error text,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_track_releases_due ON track_releases (status, scheduled_at);

COMMIT;
