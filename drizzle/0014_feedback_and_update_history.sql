BEGIN;

CREATE TABLE feedback (
  id varchar(36) PRIMARY KEY,
  user_id varchar(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  allow_contact boolean NOT NULL DEFAULT false,
  contact_email varchar(255),
  acknowledgement text NOT NULL,
  response_source varchar(16) NOT NULL DEFAULT 'fallback',
  email_notification_status varchar(16) NOT NULL DEFAULT 'pending',
  push_notification_status varchar(16) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_created ON feedback(created_at, id);
CREATE INDEX idx_feedback_user_created ON feedback(user_id, created_at);

CREATE TABLE feedback_replies (
  id varchar(36) PRIMARY KEY,
  feedback_id varchar(36) NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  body text NOT NULL,
  email_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_replies_feedback ON feedback_replies(feedback_id);

ALTER TABLE announcements ADD COLUMN first_published_at timestamp;
ALTER TABLE announcements ADD COLUMN history_date_estimated boolean NOT NULL DEFAULT false;
UPDATE announcements SET first_published_at = published_at WHERE published_at IS NOT NULL;
-- Old releases erased publication dates. A recorded dismissal proves an update
-- was public. Restore those entries using the earliest recorded view and label
-- the date as approximate; never expose drafts with no publication evidence.
UPDATE announcements a SET first_published_at = d.first_seen, history_date_estimated = true
FROM (SELECT announcement_id, min(dismissed_at) AS first_seen FROM announcement_dismissals GROUP BY announcement_id) d
WHERE a.id = d.announcement_id AND a.first_published_at IS NULL;
CREATE INDEX idx_announcements_history ON announcements(first_published_at, id);

COMMIT;
