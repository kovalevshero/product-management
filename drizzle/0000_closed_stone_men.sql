CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" varchar(255) NOT NULL,
	"full_name" varchar(100),
	"refresh_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"images" text[] NOT NULL,
	"created_by" varchar(100) NOT NULL,
	"created_by_id" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(100) NOT NULL,
	"updated_by_id" varchar(50) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
