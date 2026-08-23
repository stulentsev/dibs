ALTER TYPE "public"."item_status" RENAME TO "item_status_old";--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('draft', 'available', 'claimed', 'gone', 'hidden');--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" TYPE "public"."item_status"
USING (
	CASE
		WHEN "status"::text IN ('sold', 'given_away') THEN 'gone'
		ELSE "status"::text
	END
)::"public"."item_status";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
DROP TYPE "public"."item_status_old";
