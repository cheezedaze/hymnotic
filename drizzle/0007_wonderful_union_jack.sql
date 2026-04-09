CREATE TABLE "ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image_key" text NOT NULL,
	"link_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_ads_active_sort" ON "ads" USING btree ("active","sort_order");