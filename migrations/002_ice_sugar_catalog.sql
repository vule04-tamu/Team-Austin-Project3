-- Replace Ice Level / Sugar Level catalog with percentage sugar + ice set.
-- Run after 001 if those categories already exist with old names.
-- Removes prior junction rows for deleted options (ON DELETE CASCADE).

BEGIN;

DELETE FROM customization_options
WHERE category IN ('Ice Level', 'Sugar Level');

INSERT INTO customization_options (category, name, price_modifier, inventory_item_id, inventory_use_qty)
VALUES
    ('Ice Level', 'No Ice', 0.00, NULL, 1.0),
    ('Ice Level', 'Light Ice', 0.00, NULL, 1.0),
    ('Ice Level', 'Regular Ice', 0.00, NULL, 1.0),
    ('Ice Level', 'Extra Ice', 0.00, NULL, 1.0),
    ('Sugar Level', '0%', 0.00, NULL, 1.0),
    ('Sugar Level', '25%', 0.00, NULL, 1.0),
    ('Sugar Level', '50%', 0.00, NULL, 1.0),
    ('Sugar Level', '75%', 0.00, NULL, 1.0),
    ('Sugar Level', '100%', 0.00, NULL, 1.0);

-- Remove discontinued drink from catalog if never ordered
DELETE FROM menu_items mi
WHERE lower(mi.name) LIKE '%dreamsicle%'
  AND NOT EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.menu_item_id = mi.id
  );

COMMIT;
