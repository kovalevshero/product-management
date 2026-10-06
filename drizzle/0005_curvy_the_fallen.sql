CREATE TYPE "public"."reservation_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"status" "reservation_status" DEFAULT 'PENDING' NOT NULL,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_quantity_check" CHECK ("reservations"."quantity" BETWEEN 1 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"actor_id" integer NOT NULL,
	"operation" varchar(40) NOT NULL,
	"key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"resource_id" uuid NOT NULL,
	CONSTRAINT "idempotency_records_actor_id_operation_key_pk" PRIMARY KEY("actor_id","operation","key")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_resource_id_reservations_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservation_variant_idx" ON "reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "reservation_status_idx" ON "reservations" USING btree ("status","created_at");