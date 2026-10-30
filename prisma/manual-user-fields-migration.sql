-- Run this once against the database BEFORE running `prisma db push` (or
-- `npm run build`, which calls `prisma db push --accept-data-loss`) with the
-- updated schema.
--
-- The schema adds two required columns (firstName, lastName) to User.
-- `db push` cannot add NOT NULL columns to a table that already has rows
-- without a default, so this script adds them as nullable first, backfills
-- them from the existing `name` column, then locks them to NOT NULL.
-- avatarUrl is nullable already and needs no backfill, but is included here
-- for a single one-shot migration file.
--
-- Usage: psql "$DATABASE_URL" -f prisma/manual-user-fields-migration.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Split the existing full name on the first space: everything before it
-- becomes firstName, everything after becomes lastName. Single-word names
-- (e.g. seed/bootstrap accounts) get a "-" placeholder lastName so the
-- NOT NULL constraint below can be applied safely; edit them via the Users
-- page afterwards if you want a real value.
UPDATE "User"
SET
  "firstName" = COALESCE(NULLIF(TRIM(SPLIT_PART("name", ' ', 1)), ''), 'User'),
  "lastName"  = CASE
    WHEN POSITION(' ' IN "name") > 0
      THEN NULLIF(TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)), '')
    ELSE NULL
  END
WHERE "firstName" IS NULL;

UPDATE "User" SET "lastName" = '-' WHERE "lastName" IS NULL;

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;
