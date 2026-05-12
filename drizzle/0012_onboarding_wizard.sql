-- Onboarding wizard: track completion / dismissal state on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "onboarding_last_dismissed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "onboarding_dismiss_count" integer DEFAULT 0 NOT NULL;

-- Store wizard responses for future AI analysis
CREATE TABLE IF NOT EXISTS "onboarding_responses" (
  "user_id" varchar(128) PRIMARY KEY NOT NULL,
  "referral_source" varchar(64),
  "referral_detail" text,
  "favorite_music" text,
  "favorite_hymns" text,
  "completed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "onboarding_responses_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
