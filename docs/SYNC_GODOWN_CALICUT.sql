-- One-time sync for legacy godown rename from Kottakkal to Calicut.
-- Run this in Supabase SQL editor if Settings already shows "Calicut"
-- but stock/order pages still show "Kottakkal".

BEGIN;

-- 1) Make the settings row authoritative.
UPDATE settings
SET
  value = (
    SELECT jsonb_agg(
      CASE
        WHEN item = 'Kottakkal' THEN 'Calicut'
        ELSE item
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements_text(value) WITH ORDINALITY AS src(item, ord)
  ),
  updated_at = NOW()
WHERE key = 'godowns'
  AND jsonb_typeof(value) = 'array';

-- 2) Merge stock rows into the renamed location without losing quantities.
CREATE TEMP TABLE tmp_product_stock_locations AS
SELECT
  product_id,
  CASE
    WHEN location = 'Kottakkal' THEN 'Calicut'
    ELSE location
  END AS location,
  SUM(stock_qty) AS stock_qty
FROM product_stock_locations
GROUP BY
  product_id,
  CASE
    WHEN location = 'Kottakkal' THEN 'Calicut'
    ELSE location
  END;

DELETE FROM product_stock_locations;

INSERT INTO product_stock_locations (product_id, location, stock_qty)
SELECT product_id, location, stock_qty
FROM tmp_product_stock_locations;

DROP TABLE tmp_product_stock_locations;

-- 3) Rename all transactional references.
UPDATE orders
SET godown = 'Calicut'
WHERE godown = 'Kottakkal';

UPDATE grn_items
SET location = 'Calicut'
WHERE location = 'Kottakkal';

UPDATE stock_adjustments
SET location = 'Calicut'
WHERE location = 'Kottakkal';

UPDATE stock_movements
SET location = 'Calicut'
WHERE location = 'Kottakkal';

UPDATE stock_transfers
SET from_location = 'Calicut'
WHERE from_location = 'Kottakkal';

UPDATE stock_transfers
SET to_location = 'Calicut'
WHERE to_location = 'Kottakkal';

COMMIT;
