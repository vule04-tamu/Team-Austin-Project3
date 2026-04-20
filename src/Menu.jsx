import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageSwitch";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Menu.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const SECTIONS = [
  {
    labelKey: "sec_milk_teas",
    names: [
      "Classic Milk Tea", "Jasmine Green Milk Tea", "Taro Milk Tea",
      "Thai Milk Tea", "Honey Milk Tea", "Brown Sugar Milk Tea",
      "Strawberry Milk Tea", "Wintermelon Milk Tea", "Coffee Milk Tea",
      "Coconut Milk Tea", "Chocolate Milk Tea", "Oreo Milk Tea", "March Milk Tea",
    ]
  },
  {
    labelKey: "sec_fruit_teas",
    names: [
      "Mango Green Tea", "Passion Fruit Tea", "Lychee Green Tea",
      "Peach Oolong Tea", "Wintermelon Tea", "Honey Lemon Tea", "Mint Tea",
    ]
  },
  {
    labelKey: "sec_specialties",
    names: ["Matcha Latte", "jayden special", "Fresh Milk"]
  },
  {
    labelKey: "sec_toppings",
    names: ["Boba Pearls", "Lychee Jelly"]
  }
];

export default function Menu() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/menu`);
        if (!response.ok) throw new Error("Failed to fetch menu");
        setMenuItems(await response.json());
        setError(null);
      } catch (err) {
        setError(err.message);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const byName = Object.fromEntries(menuItems.map((item) => [item.name, item]));

  const largeByBase = useMemo(() => {
    const m = {};
    for (const item of menuItems) {
      if (item.name.endsWith(" (Large)")) {
        m[item.name.slice(0, -" (Large)".length)] = item;
      }
    }
    return m;
  }, [menuItems]);

  const fmt = (n) => `$${n.toFixed(2)}`;

  if (loading) {
    return (
      <div className="menu-wrap menu-board">
        <button
          type="button"
          className="menu-board-back"
          onClick={() => navigate("/")}
        >
          {t("back")}
        </button>
        <p className="menu-status">{t('loading_menu')}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="menu-wrap menu-board">
        <button
          type="button"
          className="menu-board-back"
          onClick={() => navigate("/")}
        >
          {t("back")}
        </button>
        <p className="menu-status menu-error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="menu-wrap menu-board">
      <button
        type="button"
        className="menu-board-back"
        onClick={() => navigate("/")}
      >
        {t("back")}
      </button>
      <LanguageSwitcher />
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
        {SECTIONS.map(({ labelKey, names }) => {
          const items = names.map((n) => byName[n]).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <section key={labelKey} className="menu-board-col">
              <h2 className="menu-board-col-title">{t(labelKey)}</h2>
              <div className="menu-board-items">
                {items.map((item) => {
                  const lg = largeByBase[item.name];
                  return (
                    <div key={item.id} className="menu-board-item">
                      <p className="item-name">{item.name}</p>
                      <div className="item-footer">
                        <span className="item-price">
                          {lg
                            ? `${t('reg')} ${fmt(item.price)} / ${t('lg')} ${fmt(lg.price)}`
                            : fmt(item.price)}
                        </span>
                        {item.customizable && (
                          <span className="item-badge">{t('custom_badge')}</span>
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