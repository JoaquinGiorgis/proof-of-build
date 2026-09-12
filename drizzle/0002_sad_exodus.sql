CREATE TABLE "claim_codes" (
	"code" varchar(32) PRIMARY KEY NOT NULL,
	"event_slug" varchar(64) NOT NULL,
	"label" text,
	"max_uses" integer DEFAULT 100 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "claim_code" varchar(32);--> statement-breakpoint
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_event_slug_events_slug_fk" FOREIGN KEY ("event_slug") REFERENCES "public"."events"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_codes_event_slug_idx" ON "claim_codes" USING btree ("event_slug");--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_claim_code_claim_codes_code_fk" FOREIGN KEY ("claim_code") REFERENCES "public"."claim_codes"("code") ON DELETE set null ON UPDATE no action;