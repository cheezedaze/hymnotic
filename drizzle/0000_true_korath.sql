CREATE TABLE "collections" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"artwork_key" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" text NOT NULL,
	"section_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"reference_id" varchar(128) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lyrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" varchar(128) NOT NULL,
	"line_number" integer NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"text" text NOT NULL,
	"is_chorus" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"collection_id" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT 'Hymnotic' NOT NULL,
	"artwork_key" text,
	"audio_key" text,
	"audio_format" varchar(10),
	"original_audio_key" text,
	"duration" real NOT NULL,
	"track_number" integer NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_video" boolean DEFAULT false NOT NULL,
	"video_key" text,
	"video_thumbnail_key" text,
	"video_count" integer DEFAULT 0 NOT NULL,
	"has_lyrics" boolean DEFAULT false NOT NULL,
	"youtube_url" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"youtube_url" text NOT NULL,
	"thumbnail_url" text,
	"track_id" varchar(128),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lyrics" ADD CONSTRAINT "lyrics_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collections_featured" ON "collections" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_collections_sort_order" ON "collections" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_content_blocks_page" ON "content_blocks" USING btree ("page");--> statement-breakpoint
CREATE INDEX "idx_content_blocks_page_sort" ON "content_blocks" USING btree ("page","sort_order");--> statement-breakpoint
CREATE INDEX "idx_lyrics_track" ON "lyrics" USING btree ("track_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_lyrics_track_line" ON "lyrics" USING btree ("track_id","line_number");--> statement-breakpoint
CREATE INDEX "idx_tracks_collection" ON "tracks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_collection_order" ON "tracks" USING btree ("collection_id","track_number");--> statement-breakpoint
CREATE INDEX "idx_videos_track" ON "videos" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_videos_sort" ON "videos" USING btree ("sort_order");