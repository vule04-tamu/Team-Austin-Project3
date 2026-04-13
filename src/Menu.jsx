import { useState, useEffect } from "react";
import "./Menu.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const SECTIONS = [
  {
    label: "Milk Teas",
    names: [
      "Classic Milk Tea", "Classic Milk Tea (Large)",
      "Jasmine Green Milk Tea", "Jasmine Green Milk Tea (Large)",
      "Taro Milk Tea", "Taro Milk Tea (Large)",
      "Thai Milk Tea", "Thai Milk Tea (Large)",
      "Honey Milk Tea", "Honey Milk Tea (Large)",
      "Brown Sugar Milk Tea", "Brown Sugar Milk Tea (Large)",
      "Strawberry Milk Tea", "Strawberry Milk Tea (Large)",
      "Wintermelon Milk Tea", "Wintermelon Milk Tea (Large)",
      "Coffee Milk Tea", "Coffee Milk Tea (Large)",
      "Coconut Milk Tea", "Coconut Milk Tea (Large)",
      "Chocolate Milk Tea", "Chocolate Milk Tea (Large)",
      "Oreo Milk Tea", "Oreo Milk Tea (Large)",
      "March Milk Tea", "March Milk Tea (Large)",
    ]
  },
  {
    label: "Fruit, Green & Oolong Teas",
    names: [
      "Mango Green Tea", "Mango Green Tea (Large)",
      "Passion Fruit Tea", "Passion Fruit Tea (Large)",
      "Lychee Green Tea", "Lychee Green Tea (Large)",
      "Peach Oolong Tea", "Peach Oolong Tea (Large)",
      "Wintermelon Tea", "Wintermelon Tea (Large)",
      "Honey Lemon Tea", "Honey Lemon Tea (Large)",
      "Mint Tea", "Mint Tea (Large)",
    ]
  },
  {
    label: "Specialties & Other Drinks",
    names: [
      "Matcha Latte", "Matcha Latte (Large)",
      "jayden special", "jayden special (Large)",
      "Fresh Milk", "Fresh Milk (Large)",
    ]
  },
  {
    label: "Toppings / Add-ons",
    names: ["Boba Pearls", "Lychee Jelly"]
  }
];

export default function Menu() {
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

  if (loading) {
    return (
      <div className="menu-wrap menu-board">
        <p className="menu-status">Loading menu…</p>
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

  const byName = Object.fromEntries(menuItems.map((item) => [item.name, item]));

  return (
    <div className="menu-wrap menu-board">
      <header className="menu-board-header">
        <h1 className="shop-name">{"Austin's Boba Shop"}</h1>
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-dot" />
          <span className="divider-line" />
        </div>
        <p className="menu-board-tagline">Handcrafted drinks</p>
      </header>

      <div className="menu-board-main">
        {SECTIONS.map(({ label, names }) => {
          const items = names.map((n) => byName[n]).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <section key={label} className="menu-board-col">
              <h2 className="menu-board-col-title">{label}</h2>
              <div className="menu-board-items">
                {items.map((item) => (
                  <div key={item.id} className="menu-board-item">
                    <p className="item-name">{item.name}</p>
                    <div className="item-footer">
                      <span className="item-price">${item.price.toFixed(2)}</span>
                      {item.customizable && (
                        <span className="item-badge">Custom</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="menu-board-footer">Ask your barista to customize any drink</p>
    </div>
  );
}
