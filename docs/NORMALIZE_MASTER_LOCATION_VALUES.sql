-- Normalize settings-based master values and location strings across tables.
-- Run this once in Supabase SQL editor if legacy values contain extra spaces/case drift.

BEGIN;

-- 1) Normalize settings arrays: trim, drop empty entries, remove duplicates, preserve first-seen order.
UPDATE settings s
SET
  value = normalized.value,
  updated_at = NOW()
FROM (
  SELECT
    key,
    COALESCE(
      jsonb_agg(value_text ORDER BY first_pos),
      '[]'::jsonb
    ) AS value
  FROM (
    SELECT
      key,
      value_text,
      MIN(pos) AS first_pos
    FROM (
      SELECT
        st.key,
        NULLIF(BTRIM(item.value_text), '') AS value_text,
        item.pos
      FROM settings st
      CROSS JOIN LATERAL jsonb_array_elements_text(st.value) WITH ORDINALITY AS item(value_text, pos)
      WHERE st.key IN ('Godowns', 'districts', 'vehicle_types')
        AND jsonb_typeof(st.value) = 'array'
    ) cleaned
    WHERE value_text IS NOT NULL
    GROUP BY key, value_text
  ) dedup
  GROUP BY key
) normalized
WHERE s.key = normalized.key;

-- 2) Normalize product stock locations safely by aggregating into canonical trimmed keys.
WITH normalized_stock AS (
  SELECT
    product_id,
    NULLIF(BTRIM(location), '') AS normalized_location,
    SUM(stock_qty) AS total_qty
  FROM product_stock_locations
  GROUP BY product_id, NULLIF(BTRIM(location), '')
),
upserted AS (
  INSERT INTO product_stock_locations (product_id, location, stock_qty)
  SELECT
    product_id,
    normalized_location,
    total_qty
  FROM normalized_stock
  WHERE normalized_location IS NOT NULL
  ON CONFLICT (product_id, location)
  DO UPDATE SET
    stock_qty = EXCLUDED.stock_qty,
    updated_at = NOW()
)
DELETE FROM product_stock_locations
WHERE location IS NULL
   OR NULLIF(BTRIM(location), '') IS NULL
   OR location <> BTRIM(location);

-- 3) Normalize location text columns.
UPDATE orders
SET Godown = NULLIF(BTRIM(Godown), '')
WHERE Godown IS NOT NULL
  AND (BTRIM(Godown) = '' OR Godown <> BTRIM(Godown));

UPDATE grn_items
SET location = BTRIM(location)
WHERE location IS NOT NULL
  AND location <> BTRIM(location);

UPDATE stock_adjustments
SET location = BTRIM(location)
WHERE location IS NOT NULL
  AND location <> BTRIM(location);

UPDATE stock_movements
SET location = BTRIM(location)
WHERE location IS NOT NULL
  AND location <> BTRIM(location);

UPDATE stock_transfers
SET
  from_location = BTRIM(from_location),
  to_location = BTRIM(to_location)
WHERE from_location IS NOT NULL
  AND to_location IS NOT NULL
  AND (
    from_location <> BTRIM(from_location)
    OR to_location <> BTRIM(to_location)
  );

UPDATE customers
SET location = NULLIF(BTRIM(location), '')
WHERE location IS NOT NULL
  AND (BTRIM(location) = '' OR location <> BTRIM(location));

UPDATE delivery_agents
SET
  vehicle_type = BTRIM(vehicle_type),
  vehicle_type_other = NULLIF(BTRIM(vehicle_type_other), '')
WHERE vehicle_type IS NOT NULL
   OR vehicle_type_other IS NOT NULL;

COMMIT;
