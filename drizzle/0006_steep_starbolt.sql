CREATE TABLE "play_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"track_id" varchar(128) NOT NULL,
	"played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_play_events_track" ON "play_events" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_play_events_played_at" ON "play_events" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "idx_play_events_track_played_at" ON "play_events" USING btree ("track_id","played_at");