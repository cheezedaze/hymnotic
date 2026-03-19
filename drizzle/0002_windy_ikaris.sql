CREATE TABLE "sacred7_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" varchar(128) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sacred7_tracks" ADD CONSTRAINT "sacred7_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sacred7_tracks_track" ON "sacred7_tracks" USING btree ("track_id");--> statement-breakpoint
-- Clear isSacred7 from any existing collection, then create the dedicated Sacred 7 collection
UPDATE "collections" SET "is_sacred_7" = false WHERE "is_sacred_7" = true;--> statement-breakpoint
INSERT INTO "collections" ("id", "title", "subtitle", "is_sacred_7", "sort_order", "created_at", "updated_at")
VALUES ('sacred-7', 'Sacred 7', 'Free tracks for all members', true, 0, now(), now())
ON CONFLICT ("id") DO UPDATE SET "is_sacred_7" = true, "title" = 'Sacred 7', "subtitle" = 'Free tracks for all members';