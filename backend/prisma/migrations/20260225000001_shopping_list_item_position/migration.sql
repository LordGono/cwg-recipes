-- Add position field to shopping_list_items for drag-to-reorder support
ALTER TABLE "shopping_list_items" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sequential positions based on creation order within each list
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at ASC) - 1 AS rn
  FROM shopping_list_items
)
UPDATE shopping_list_items
SET position = ranked.rn
FROM ranked
WHERE shopping_list_items.id = ranked.id;
