-- Run this once against the database BEFORE running `prisma db push` (or
-- `npm run build`, which calls `prisma db push --accept-data-loss`) with the
-- updated schema.
--
-- The project uses `prisma db push` rather than tracked migrations, and
-- Postgres enums can't be diffed as a "rename" automatically - db push would
-- otherwise see LOST removed / CANCELLED + QUOTED added and try to drop LOST
-- outright, which fails (or silently loses data) for any renewal still
-- sitting in that status.
--
-- Running the two statements below first means the enum already matches the
-- new schema by the time you run `prisma db push`, so it will find no enum
-- diff to apply and no existing "Lost" renewals are touched or lost.
--
-- Usage: psql "$DATABASE_URL" -f prisma/manual-status-migration.sql

ALTER TYPE "RenewalStatus" RENAME VALUE 'LOST' TO 'CANCELLED';
ALTER TYPE "RenewalStatus" ADD VALUE IF NOT EXISTS 'QUOTED' BEFORE 'CONTACTED';
