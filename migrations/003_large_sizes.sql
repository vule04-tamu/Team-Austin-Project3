-- Migration 003: Add Large drink sizes as distinct menu_items with recipes.
-- Generated from menu_items_large.csv and recipes_large.csv.
-- Idempotent: skips items whose name already exists.

BEGIN;

-- ============================================================
-- 1. Insert Large menu_items (skip if name already present)
-- ============================================================
INSERT INTO menu_items (name, price, customizable)
SELECT v.name, v.price, v.customizable
FROM (VALUES
    ('Classic Milk Tea (Large)',        7.84, true),
    ('Jasmine Green Milk Tea (Large)', 68.00, true),
    ('Taro Milk Tea (Large)',           6.56, true),
    ('Thai Milk Tea (Large)',           6.32, true),
    ('Honey Milk Tea (Large)',          6.14, true),
    ('Brown Sugar Milk Tea (Large)',    6.32, true),
    ('Matcha Latte (Large)',            6.04, true),
    ('Strawberry Milk Tea (Large)',     7.49, true),
    ('Mango Green Tea (Large)',         7.00, true),
    ('Passion Fruit Tea (Large)',       7.40, true),
    ('Lychee Green Tea (Large)',        6.40, true),
    ('Peach Oolong Tea (Large)',        7.13, true),
    ('Wintermelon Tea (Large)',         6.44, true),
    ('Wintermelon Milk Tea (Large)',    7.20, true),
    ('Coffee Milk Tea (Large)',         6.84, true),
    ('Coconut Milk Tea (Large)',        6.18, true),
    ('Chocolate Milk Tea (Large)',      6.30, true),
    ('Oreo Milk Tea (Large)',           6.60, true),
    ('Honey Lemon Tea (Large)',         5.69, true),
    ('Fresh Milk (Large)',              6.34, true),
    ('Mint Tea (Large)',                2.99, true),
    ('March Milk Tea (Large)',         10.99, true),
    ('jayden special (Large)',         10.99, true)
) AS v(name, price, customizable)
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.name = v.name
);

-- ============================================================
-- 2. Insert recipe rows for each Large item
--    Uses a CTE to resolve menu_item_id by name.
-- ============================================================
INSERT INTO recipes (menu_item_id, inventory_item_id, quantity_needed)
SELECT mi.id, v.inv_id, v.qty
FROM (VALUES
    -- Classic Milk Tea (Large)
    ('Classic Milk Tea (Large)',          1, 1.5),
    ('Classic Milk Tea (Large)',          4, 1.5),
    ('Classic Milk Tea (Large)',          9, 1.5),
    ('Classic Milk Tea (Large)',         24, 1.0),
    ('Classic Milk Tea (Large)',         25, 1.0),
    ('Classic Milk Tea (Large)',         26, 1.0),
    ('Classic Milk Tea (Large)',         30, 1.0),
    -- Jasmine Green Milk Tea (Large)
    ('Jasmine Green Milk Tea (Large)',    2, 1.5),
    ('Jasmine Green Milk Tea (Large)',    4, 1.5),
    ('Jasmine Green Milk Tea (Large)',    9, 1.5),
    ('Jasmine Green Milk Tea (Large)',   24, 1.0),
    ('Jasmine Green Milk Tea (Large)',   25, 1.0),
    ('Jasmine Green Milk Tea (Large)',   26, 1.0),
    ('Jasmine Green Milk Tea (Large)',   30, 1.0),
    -- Taro Milk Tea (Large)
    ('Taro Milk Tea (Large)',             4, 1.5),
    ('Taro Milk Tea (Large)',             6, 1.5),
    ('Taro Milk Tea (Large)',             9, 1.5),
    ('Taro Milk Tea (Large)',            24, 1.0),
    ('Taro Milk Tea (Large)',            25, 1.0),
    ('Taro Milk Tea (Large)',            26, 1.0),
    ('Taro Milk Tea (Large)',            30, 1.0),
    -- Thai Milk Tea (Large)
    ('Thai Milk Tea (Large)',             4, 1.5),
    ('Thai Milk Tea (Large)',             7, 1.5),
    ('Thai Milk Tea (Large)',             9, 1.5),
    ('Thai Milk Tea (Large)',            24, 1.0),
    ('Thai Milk Tea (Large)',            25, 1.0),
    ('Thai Milk Tea (Large)',            26, 1.0),
    ('Thai Milk Tea (Large)',            30, 1.0),
    -- Honey Milk Tea (Large)
    ('Honey Milk Tea (Large)',            1, 1.5),
    ('Honey Milk Tea (Large)',            4, 1.5),
    ('Honey Milk Tea (Large)',            8, 1.5),
    ('Honey Milk Tea (Large)',           24, 1.0),
    ('Honey Milk Tea (Large)',           25, 1.0),
    ('Honey Milk Tea (Large)',           26, 1.0),
    ('Honey Milk Tea (Large)',           30, 1.0),
    -- Brown Sugar Milk Tea (Large)
    ('Brown Sugar Milk Tea (Large)',      1, 1.5),
    ('Brown Sugar Milk Tea (Large)',      4, 1.5),
    ('Brown Sugar Milk Tea (Large)',      9, 1.5),
    ('Brown Sugar Milk Tea (Large)',     24, 1.0),
    ('Brown Sugar Milk Tea (Large)',     25, 1.0),
    ('Brown Sugar Milk Tea (Large)',     26, 1.0),
    ('Brown Sugar Milk Tea (Large)',     30, 1.0),
    -- Matcha Latte (Large)
    ('Matcha Latte (Large)',              4, 1.5),
    ('Matcha Latte (Large)',              9, 1.5),
    ('Matcha Latte (Large)',             10, 1.5),
    ('Matcha Latte (Large)',             24, 1.0),
    ('Matcha Latte (Large)',             25, 1.0),
    ('Matcha Latte (Large)',             26, 1.0),
    ('Matcha Latte (Large)',             30, 1.0),
    -- Strawberry Milk Tea (Large)
    ('Strawberry Milk Tea (Large)',       1, 1.5),
    ('Strawberry Milk Tea (Large)',       4, 1.5),
    ('Strawberry Milk Tea (Large)',      11, 1.5),
    ('Strawberry Milk Tea (Large)',      24, 1.0),
    ('Strawberry Milk Tea (Large)',      25, 1.0),
    ('Strawberry Milk Tea (Large)',      26, 1.0),
    ('Strawberry Milk Tea (Large)',      30, 1.0),
    -- Mango Green Tea (Large)
    ('Mango Green Tea (Large)',           2, 1.5),
    ('Mango Green Tea (Large)',          12, 1.5),
    ('Mango Green Tea (Large)',          24, 1.0),
    ('Mango Green Tea (Large)',          25, 1.0),
    ('Mango Green Tea (Large)',          26, 1.0),
    ('Mango Green Tea (Large)',          30, 1.0),
    -- Passion Fruit Tea (Large)
    ('Passion Fruit Tea (Large)',         1, 1.5),
    ('Passion Fruit Tea (Large)',        13, 1.5),
    ('Passion Fruit Tea (Large)',        24, 1.0),
    ('Passion Fruit Tea (Large)',        25, 1.0),
    ('Passion Fruit Tea (Large)',        26, 1.0),
    ('Passion Fruit Tea (Large)',        30, 1.0),
    -- Lychee Green Tea (Large)
    ('Lychee Green Tea (Large)',          2, 1.5),
    ('Lychee Green Tea (Large)',         14, 1.5),
    ('Lychee Green Tea (Large)',         24, 1.0),
    ('Lychee Green Tea (Large)',         25, 1.0),
    ('Lychee Green Tea (Large)',         26, 1.0),
    ('Lychee Green Tea (Large)',         30, 1.0),
    -- Peach Oolong Tea (Large)
    ('Peach Oolong Tea (Large)',          3, 1.5),
    ('Peach Oolong Tea (Large)',         15, 1.5),
    ('Peach Oolong Tea (Large)',         24, 1.0),
    ('Peach Oolong Tea (Large)',         25, 1.0),
    ('Peach Oolong Tea (Large)',         26, 1.0),
    ('Peach Oolong Tea (Large)',         30, 1.0),
    -- Wintermelon Tea (Large)
    ('Wintermelon Tea (Large)',           1, 1.5),
    ('Wintermelon Tea (Large)',          16, 1.5),
    ('Wintermelon Tea (Large)',          24, 1.0),
    ('Wintermelon Tea (Large)',          25, 1.0),
    ('Wintermelon Tea (Large)',          26, 1.0),
    ('Wintermelon Tea (Large)',          30, 1.0),
    -- Wintermelon Milk Tea (Large)
    ('Wintermelon Milk Tea (Large)',      1, 1.5),
    ('Wintermelon Milk Tea (Large)',      4, 1.5),
    ('Wintermelon Milk Tea (Large)',     16, 1.5),
    ('Wintermelon Milk Tea (Large)',     24, 1.0),
    ('Wintermelon Milk Tea (Large)',     25, 1.0),
    ('Wintermelon Milk Tea (Large)',     26, 1.0),
    ('Wintermelon Milk Tea (Large)',     30, 1.0),
    -- Coffee Milk Tea (Large)
    ('Coffee Milk Tea (Large)',           1, 1.5),
    ('Coffee Milk Tea (Large)',           4, 1.5),
    ('Coffee Milk Tea (Large)',          17, 1.5),
    ('Coffee Milk Tea (Large)',          24, 1.0),
    ('Coffee Milk Tea (Large)',          25, 1.0),
    ('Coffee Milk Tea (Large)',          26, 1.0),
    ('Coffee Milk Tea (Large)',          30, 1.0),
    -- Coconut Milk Tea (Large)
    ('Coconut Milk Tea (Large)',          1, 1.5),
    ('Coconut Milk Tea (Large)',          4, 1.5),
    ('Coconut Milk Tea (Large)',         18, 1.5),
    ('Coconut Milk Tea (Large)',         24, 1.0),
    ('Coconut Milk Tea (Large)',         25, 1.0),
    ('Coconut Milk Tea (Large)',         26, 1.0),
    ('Coconut Milk Tea (Large)',         30, 1.0),
    -- Chocolate Milk Tea (Large)
    ('Chocolate Milk Tea (Large)',        1, 1.5),
    ('Chocolate Milk Tea (Large)',        4, 1.5),
    ('Chocolate Milk Tea (Large)',       19, 1.5),
    ('Chocolate Milk Tea (Large)',       24, 1.0),
    ('Chocolate Milk Tea (Large)',       25, 1.0),
    ('Chocolate Milk Tea (Large)',       26, 1.0),
    ('Chocolate Milk Tea (Large)',       30, 1.0),
    -- Oreo Milk Tea (Large)
    ('Oreo Milk Tea (Large)',             1, 1.5),
    ('Oreo Milk Tea (Large)',             4, 1.5),
    ('Oreo Milk Tea (Large)',            19, 1.5),
    ('Oreo Milk Tea (Large)',            20, 1.0),
    ('Oreo Milk Tea (Large)',            24, 1.0),
    ('Oreo Milk Tea (Large)',            25, 1.0),
    ('Oreo Milk Tea (Large)',            26, 1.0),
    ('Oreo Milk Tea (Large)',            30, 1.0),
    -- Honey Lemon Tea (Large)
    ('Honey Lemon Tea (Large)',           2, 1.5),
    ('Honey Lemon Tea (Large)',           8, 1.5),
    ('Honey Lemon Tea (Large)',          21, 1.5),
    ('Honey Lemon Tea (Large)',          24, 1.0),
    ('Honey Lemon Tea (Large)',          25, 1.0),
    ('Honey Lemon Tea (Large)',          26, 1.0),
    ('Honey Lemon Tea (Large)',          30, 1.0),
    -- Fresh Milk (Large)
    ('Fresh Milk (Large)',                4, 1.5),
    ('Fresh Milk (Large)',               24, 1.0),
    ('Fresh Milk (Large)',               25, 1.0),
    ('Fresh Milk (Large)',               26, 1.0),
    ('Fresh Milk (Large)',               30, 1.0),
    -- Mint Tea (Large)
    ('Mint Tea (Large)',                  1, 1.5),
    ('Mint Tea (Large)',                 31, 1.5),
    ('Mint Tea (Large)',                 24, 1.0),
    ('Mint Tea (Large)',                 25, 1.0),
    ('Mint Tea (Large)',                 26, 1.0),
    ('Mint Tea (Large)',                 30, 1.0),
    -- March Milk Tea (Large)
    ('March Milk Tea (Large)',            4, 1.5),
    ('March Milk Tea (Large)',           32, 1.5),
    ('March Milk Tea (Large)',           33, 1.5),
    ('March Milk Tea (Large)',           24, 1.0),
    ('March Milk Tea (Large)',           25, 1.0),
    ('March Milk Tea (Large)',           26, 1.0),
    ('March Milk Tea (Large)',           30, 1.0),
    -- jayden special (Large)
    ('jayden special (Large)',           36, 2.0),
    ('jayden special (Large)',           24, 1.0),
    ('jayden special (Large)',           25, 1.0),
    ('jayden special (Large)',           26, 1.0),
    ('jayden special (Large)',           30, 1.0)
) AS v(item_name, inv_id, qty)
JOIN menu_items mi ON mi.name = v.item_name
WHERE NOT EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.menu_item_id = mi.id AND r.inventory_item_id = v.inv_id
);

COMMIT;
