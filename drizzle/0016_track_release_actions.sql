-- Keep the release form's optional button until a scheduled track goes live.
-- Only backfill when first adding the columns, so an intentional "None" stays None.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'track_releases' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE track_releases ADD COLUMN action_type varchar(10);
    ALTER TABLE track_releases ADD COLUMN action_track_id varchar(128);
    ALTER TABLE track_releases ADD COLUMN action_url text;
    ALTER TABLE track_releases ADD COLUMN action_label varchar(60);
    UPDATE track_releases
    SET action_type = 'track', action_track_id = track_id
    WHERE announcement_title IS NOT NULL AND announcement_body IS NOT NULL;
  END IF;
END $$;
