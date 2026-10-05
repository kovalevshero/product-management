CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" varchar(80) NOT NULL,
	"label" varchar(100) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variant_balance_check" CHECK ("product_variants"."on_hand" >= 0 AND "product_variants"."reserved" >= 0 AND "product_variants"."reserved" <= "product_variants"."on_hand"),
	CONSTRAINT "variant_price_check" CHECK ("product_variants"."price" > 0),
	CONSTRAINT "variant_sku_check" CHECK ("product_variants"."sku" ~ '^[A-Z0-9][A-Z0-9_-]{0,79}$')
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "variant_product_idx" ON "product_variants" USING btree ("product_id");