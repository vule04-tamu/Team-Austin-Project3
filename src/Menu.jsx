import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "./LanguageSwitch";
import "./Menu.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const LARGE_SUFFIX = " (Large)";

const DRINK_SECTIONS = [
  {
    key: "milk-teas",
    labelKey: "sec_milk_teas",
    className: "section-sec_milk_teas",
    preferredNames: [
      "Classic Milk Tea", "Jasmine Green Milk Tea", "Taro Milk Tea",
      "Thai Milk Tea", "Honey Milk Tea", "Brown Sugar Milk Tea",
      "Strawberry Milk Tea", "Wintermelon Milk Tea", "Coffee Milk Tea",
      "Coconut Milk Tea", "Chocolate Milk Tea", "Oreo Milk Tea", "March Milk Tea",
    ]
  },
  {
    key: "fruit-teas",
    labelKey: "sec_fruit_teas",
    className: "section-sec_fruit_teas",
    preferredNames: [
      "Mango Green Tea", "Passion Fruit Tea", "Lychee Green Tea",
      "Peach Oolong Tea", "Wintermelon Tea", "Honey Lemon Tea", "Mint Tea",
    ]
  },
  {
    key: "specialties",
    labelKey: "sec_specialties",
    className: "section-sec_specialties",
    preferredNames: ["Matcha Latte", "jayden special", "Fresh Milk"]
  }
];

const TOPPINGS_SECTION = {
  key: "toppings",
  labelKey: "sec_toppings",
  className: "section-sec_toppings",
};

const TOPPING_KEYWORDS = [
  "boba",
  "jelly",
  "popping",
  "pearl",
  "pudding",
  "aloe",
  "topping",
];

const exactDrinkSectionByName = new Map(
  DRINK_SECTIONS.flatMap((section) =>
    section.preferredNames.map((name) => [name, section.key]),
  ),
);

const isLargeVariant = (name = "") => name.endsWith(LARGE_SUFFIX);

const isToppingLikeName = (name = "") => {
  const lower = name.toLowerCase();
  return TOPPING_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const displayNameForSort = (item) => item.displayName || item.name;

const sortByPreferredNames = (items, preferredNames) => {
  const order = new Map(preferredNames.map((name, index) => [name, index]));
  return items.slice().sort((a, b) => {
    const aRank = order.get(a.name);
    const bRank = order.get(b.name);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return displayNameForSort(a).localeCompare(displayNameForSort(b), undefined, {
      sensitivity: "base",
    });
  });
};

const classifyDrinkSection = (name = "") => {
  if (exactDrinkSectionByName.has(name)) {
    return exactDrinkSectionByName.get(name);
  }

  if (isToppingLikeName(name)) {
    return TOPPINGS_SECTION.key;
  }

  const lower = name.toLowerCase();
  if (lower.includes("milk tea")) return "milk-teas";
  if (lower.includes("tea")) return "fruit-teas";
  return "specialties";
};

export default function Menu() {
  const { language, t } = useLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const [customizationOptions, setCustomizationOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMenu = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ lang: language });
        const [menuResponse, customizationResponse] = await Promise.all([
          fetch(`${API_BASE}/api/menu?${params.toString()}`),
          fetch(`${API_BASE}/api/menu/customizations?${params.toString()}`),
        ]);
        if (!menuResponse.ok) throw new Error("Failed to fetch menu");
        const [data, customizationData] = await Promise.all([
          menuResponse.json(),
          customizationResponse.ok ? customizationResponse.json() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setMenuItems(data);
        setCustomizationOptions(customizationData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setMenuItems([]);
        setCustomizationOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMenu();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const largeByBase = useMemo(() => {
    const m = {};
    for (const item of menuItems) {
      if (isLargeVariant(item.name)) {
        m[item.name.slice(0, -LARGE_SUFFIX.length)] = item;
      }
    }
    return m;
  }, [menuItems]);

  const regularMenuItems = useMemo(
    () => menuItems.filter((item) => !isLargeVariant(item.name)),
    [menuItems],
  );

  const boardSections = useMemo(() => {
    const itemsBySection = new Map(
      DRINK_SECTIONS.map((section) => [section.key, []]),
    );

    for (const item of regularMenuItems) {
      const sectionKey = classifyDrinkSection(item.name);
      if (sectionKey === TOPPINGS_SECTION.key) continue;
      itemsBySection.get(sectionKey)?.push(item);
    }

    const toppingNameSet = new Set();
    const toppingItems = customizationOptions
      .filter((option) => option.category === "Toppings")
      .slice()
      .sort((a, b) =>
        displayNameForSort(a).localeCompare(displayNameForSort(b), undefined, {
          sensitivity: "base",
        }),
      )
      .map((option) => {
        toppingNameSet.add(option.name.toLowerCase());
        return {
          ...option,
          itemType: "customization",
        };
      });

    for (const item of regularMenuItems) {
      if (!isToppingLikeName(item.name)) continue;
      const key = item.name.toLowerCase();
      if (toppingNameSet.has(key)) continue;
      toppingItems.push({
        ...item,
        itemType: "menu-item",
      });
    }

    toppingItems.sort((a, b) =>
      displayNameForSort(a).localeCompare(displayNameForSort(b), undefined, {
        sensitivity: "base",
      }),
    );

    return [
      ...DRINK_SECTIONS.map((section) => ({
        ...section,
        items: sortByPreferredNames(
          itemsBySection.get(section.key) || [],
          section.preferredNames,
        ).map((item) => ({
          ...item,
          itemType: "menu-item",
        })),
      })),
      {
        ...TOPPINGS_SECTION,
        items: toppingItems,
      },
    ].filter((section) => section.items.length > 0);
  }, [customizationOptions, regularMenuItems]);

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  const displayMenuItemName = (item) => item.displayName || item.name;
  const displayCustomizationName = (item) => item.displayName || item.name;
  const addonPrice = (price) => {
    const amount = Number(price) || 0;
    return amount > 0 ? `+${fmt(amount)}` : fmt(amount);
  };

  if (loading) {
    return (
      <div className="menu-wrap menu-board">
        <p className="menu-status">{t('loading_menu')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="menu-wrap menu-board">
        <p className="menu-status menu-error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="menu-wrap menu-board">
      <header className="menu-board-header">
        <h1 className="shop-name">{t('shop_name')}</h1>
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-dot" />
          <span className="divider-line" />
        </div>
        <p className="menu-board-tagline">{t('handcrafted')}</p>
      </header>

      <div className="menu-board-main">
        {boardSections.map((section) => {
          return (
            <section key={section.key} className={`menu-board-col ${section.className}`}>
              <h2 className="menu-board-col-title">{t(section.labelKey)}</h2>
              <div className="menu-board-items">
                {section.items.map((item) => {
                  if (item.itemType === "customization") {
                    return (
                      <div key={`customization-${item.id}`} className="menu-board-item">
                        <div className="item-main">
                          <p className="item-name">{displayCustomizationName(item)}</p>
                        </div>
                        <div className="item-footer">
                          <span className="item-price">{addonPrice(item.priceModifier)}</span>
                        </div>
                      </div>
                    );
                  }

                  const lg = largeByBase[item.name];
                  return (
                    <div key={item.id} className="menu-board-item">
                      <div className="item-main">
                        <p className="item-name">{displayMenuItemName(item)}</p>
                        {item.customizable && (
                          <span className="item-badge">{t('custom_badge')}</span>
                        )}
                      </div>
                      <div className="item-footer">
                        {lg ? (
                          <span className="item-price item-price-split">
                            <span>{t('reg')} {fmt(item.price)}</span>
                            <span>{t('lg')} {fmt(lg.price)}</span>
                          </span>
                        ) : (
                          <span className="item-price">{fmt(item.price)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="menu-board-footer">{t('ask_barista')}</p>
    </div>
  );
}
