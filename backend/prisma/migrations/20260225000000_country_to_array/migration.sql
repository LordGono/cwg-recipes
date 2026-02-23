-- Migrate country (TEXT) to countries (JSONB array), backfilling existing values
ALTER TABLE "recipes"
  ADD COLUMN "countries" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "recipes"
  SET "countries" = jsonb_build_array("country")
  WHERE "country" IS NOT NULL AND "country" != '';

ALTER TABLE "recipes" DROP COLUMN "country";
