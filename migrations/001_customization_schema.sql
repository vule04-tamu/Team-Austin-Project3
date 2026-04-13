-- Boba POS: move customization choices out of menu_items into dedicated tables.
-- Run once against team DB (psql or GUI). Safe to re-run only if you adjust guards.

BEGIN;

-- 1) Catalog of modifiers (ice, sugar, toppings, etc.)
CREATE TABLE IF NOT EXISTS customization_options (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    inventory_item_id INT REFERENCES inventory_items(id) ON DELETE SET NULL,
    inventory_use_qty NUMERIC(10, 4) NOT NULL DEFAULT 1.0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_customization_options_cat_name
    ON customization_options (lower(category), lower(name));

-- 2) Which modifiers were applied to each order line
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id INT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    customization_option_id INT NOT NULL REFERENCES customization_options(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_order_item_customizations_order_item
    ON order_item_customizations (order_item_id);

-- 3) Add customizable flag on drinks (separate from legacy "this row is a modifier product")
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS customizable BOOLEAN;

-- Backfill from legacy column if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'customization'
    ) THEN
        UPDATE menu_items
        SET customizable = NOT COALESCE(customization, false)
        WHERE customizable IS NULL;

        -- Seed modifier catalog from rows that were sold as pseudo menu items
        INSERT INTO customization_options (category, name, price_modifier, inventory_item_id, inventory_use_qty)
        SELECT
            CASE
                WHEN lower(name) LIKE '%boba%' OR lower(name) LIKE '%pearl%' OR lower(name) LIKE '%jelly%' THEN 'Toppings'
                WHEN lower(name) LIKE '%ice%' THEN 'Ice Level'
                WHEN lower(name) LIKE '%sugar%' THEN 'Sugar Level'
                ELSE 'Other'
            END,
            name,
            COALESCE(price, 0),
            NULL,
            1.0
        FROM menu_items mi
        WHERE COALESCE(mi.customization, false) = true
          AND NOT EXISTS (
              SELECT 1 FROM customization_options co
              WHERE lower(co.name) = lower(mi.name)
          );

        -- Delete legacy modifier-as-menu-item rows not referenced by past orders
        DELETE FROM menu_items mi
        WHERE COALESCE(mi.customization, false) = true
          AND NOT EXISTS (
              SELECT 1 FROM order_items oi WHERE oi.menu_item_id = mi.id
          );

        ALTER TABLE menu_items DROP COLUMN customization;
    END IF;
END $$;

-- Default: drinks are customizable unless you set otherwise later
UPDATE menu_items SET customizable = true WHERE customizable IS NULL;

ALTER TABLE menu_items ALTER COLUMN customizable SET DEFAULT true;
ALTER TABLE menu_items ALTER COLUMN customizable SET NOT NULL;

-- Starter rows (skip names that already exist)
INSERT INTO customization_options (category, name, price_modifier, inventory_item_id, inventory_use_qty)
SELECT v.category, v.name, v.price, NULL, 1.0
FROM (VALUES
    ('Ice Level', 'No Ice', 0.00::numeric),
    ('Ice Level', 'Light Ice', 0.00::numeric),
    ('Sugar Level', 'No Sugar', 0.00::numeric),
    ('Sugar Level', 'Light Sugar', 0.00::numeric),
    ('Sugar Level', 'Extra Sugar', 0.00::numeric),
    ('Toppings', 'Boba Pearls', 0.50::numeric),
    ('Toppings', 'Lychee Jelly', 0.50::numeric)
) AS v(category, name, price)
WHERE NOT EXISTS (
    SELECT 1 FROM customization_options co WHERE lower(co.name) = lower(v.name)
);

COMMIT;
