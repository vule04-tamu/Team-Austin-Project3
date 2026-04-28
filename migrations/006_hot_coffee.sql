-- Migration 006: Add hot coffee and recipe.
-- Idempotent: skips items and recipe rows that already exist.

BEGIN;

INSERT INTO menu_items (name, price, customizable)
SELECT v.name, v.price, true
FROM (VALUES
    ('Hot Coffee',         3.99),
    ('Hot Coffee (Large)', 4.99)
) AS v(name, price)
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.name = v.name
);

INSERT INTO recipes (menu_item_id, inventory_item_id, quantity_needed)
SELECT mi.id, inv.id, v.qty
FROM (VALUES
    ('Hot Coffee',          17, 1.0),
    ('Hot Coffee',          24, 1.0),
    ('Hot Coffee',          25, 1.0),
    ('Hot Coffee (Large)',  17, 1.5),
    ('Hot Coffee (Large)',  24, 1.0),
    ('Hot Coffee (Large)',  25, 1.0)
) AS v(item_name, inv_id, qty)
JOIN menu_items mi ON mi.name = v.item_name
JOIN inventory_items inv ON inv.id = v.inv_id
WHERE NOT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.menu_item_id = mi.id AND r.inventory_item_id = inv.id
);

COMMIT;
