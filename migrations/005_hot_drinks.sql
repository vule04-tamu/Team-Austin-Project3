-- Migration 005: Add hot drinks and recipes.
-- Idempotent: skips items and recipe rows that already exist.

BEGIN;

INSERT INTO menu_items (name, price, customizable)
SELECT v.name, v.price, true
FROM (VALUES
    ('Hot Classic Milk Tea',        5.49),
    ('Hot Honey Lemon Tea',         4.99),
    ('Hot Matcha Latte',            5.79),
    ('Hot Classic Milk Tea (Large)', 6.49),
    ('Hot Honey Lemon Tea (Large)',  5.99),
    ('Hot Matcha Latte (Large)',     6.79)
) AS v(name, price)
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.name = v.name
);

INSERT INTO recipes (menu_item_id, inventory_item_id, quantity_needed)
SELECT mi.id, inv.id, v.qty
FROM (VALUES
    -- Hot Classic Milk Tea
    ('Hot Classic Milk Tea',          1, 1.0),
    ('Hot Classic Milk Tea',          4, 1.0),
    ('Hot Classic Milk Tea',          9, 1.0),
    ('Hot Classic Milk Tea',         24, 1.0),
    ('Hot Classic Milk Tea',         25, 1.0),
    ('Hot Classic Milk Tea (Large)',  1, 1.5),
    ('Hot Classic Milk Tea (Large)',  4, 1.5),
    ('Hot Classic Milk Tea (Large)',  9, 1.5),
    ('Hot Classic Milk Tea (Large)', 24, 1.0),
    ('Hot Classic Milk Tea (Large)', 25, 1.0),

    -- Hot Honey Lemon Tea
    ('Hot Honey Lemon Tea',           2, 1.0),
    ('Hot Honey Lemon Tea',           8, 1.0),
    ('Hot Honey Lemon Tea',          21, 1.0),
    ('Hot Honey Lemon Tea',          24, 1.0),
    ('Hot Honey Lemon Tea',          25, 1.0),
    ('Hot Honey Lemon Tea (Large)',   2, 1.5),
    ('Hot Honey Lemon Tea (Large)',   8, 1.5),
    ('Hot Honey Lemon Tea (Large)',  21, 1.5),
    ('Hot Honey Lemon Tea (Large)',  24, 1.0),
    ('Hot Honey Lemon Tea (Large)',  25, 1.0),

    -- Hot Matcha Latte
    ('Hot Matcha Latte',              4, 1.0),
    ('Hot Matcha Latte',             10, 1.0),
    ('Hot Matcha Latte',             24, 1.0),
    ('Hot Matcha Latte',             25, 1.0),
    ('Hot Matcha Latte (Large)',      4, 1.5),
    ('Hot Matcha Latte (Large)',     10, 1.5),
    ('Hot Matcha Latte (Large)',     24, 1.0),
    ('Hot Matcha Latte (Large)',     25, 1.0)
) AS v(item_name, inv_id, qty)
JOIN menu_items mi ON mi.name = v.item_name
JOIN inventory_items inv ON inv.id = v.inv_id
WHERE NOT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.menu_item_id = mi.id AND r.inventory_item_id = inv.id
);

COMMIT;
