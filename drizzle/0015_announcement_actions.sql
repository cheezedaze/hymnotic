-- Additive migration: existing announcements continue to be dismiss-only.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS action_type varchar(10);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS action_track_id varchar(128);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS action_label varchar(60);
