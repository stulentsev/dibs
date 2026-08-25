CREATE TYPE "public"."contact_method_type" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"identity" varchar(16) NOT NULL,
	"created_by" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token"),
	CONSTRAINT "invites_identity_e164" CHECK ("invites"."identity" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity" varchar(64) NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'tenant' NOT NULL,
	"display_name" varchar(80),
	"contact_type" "contact_method_type",
	"contact_value" varchar(254),
	"bootstrap_pending" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_identity_unique" UNIQUE("identity"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
	CONSTRAINT "users_tenant_identity_e164" CHECK ("users"."role" = 'owner' or "users"."identity" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "users_contact_method_valid" CHECK (("users"."contact_type" is null and "users"."contact_value" is null)
		or ("users"."contact_type" is not null and "users"."contact_value" is not null and (
			("users"."contact_type" = 'whatsapp' and "users"."contact_value" ~ '^\+[1-9][0-9]{7,14}$')
			or ("users"."contact_type" = 'email' and "users"."contact_value" = lower("users"."contact_value") and "users"."contact_value" ~ '^[^[:space:]@?&#]+@[^[:space:]@?&#]+\.[^[:space:]@?&#]+$')
		)))
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "owner_id" integer;--> statement-breakpoint
INSERT INTO "users" ("identity", "username", "password_hash", "role", "bootstrap_pending", "status")
VALUES ('owner', 'legacy-owner', '!migrated-owner-claim-on-first-boot', 'owner', true, 'active');--> statement-breakpoint
UPDATE "items" SET "owner_id" = (SELECT "id" FROM "users" WHERE "identity" = 'owner') WHERE "owner_id" IS NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE FUNCTION prevent_user_identity_change() RETURNS trigger AS $$
BEGIN
	IF NEW.identity IS DISTINCT FROM OLD.identity THEN
		RAISE EXCEPTION 'user identity is immutable';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_identity_immutable
BEFORE UPDATE OF identity ON users
FOR EACH ROW EXECUTE FUNCTION prevent_user_identity_change();
