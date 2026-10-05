CREATE TYPE "public"."movement_kind" AS ENUM('IN', 'OUT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"kind" "movement_kind" NOT NULL,
	"delta" integer NOT NULL,
	"reason" varchar(255) NOT NULL,
	"actor_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_delta_check" CHECK ("stock_movements"."delta" BETWEEN -1000000 AND 1000000 AND "stock_movements"."delta" <> 0 AND ("stock_movements"."kind" <> 'IN' OR "stock_movements"."delta" > 0) AND ("stock_movements"."kind" <> 'OUT' OR "stock_movements"."delta" < 0))
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movement_variant_created_idx" ON "stock_movements" USING btree ("variant_id","created_at","id");