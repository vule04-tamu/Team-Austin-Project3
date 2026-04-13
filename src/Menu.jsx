import { useState, useEffect } from "react";
import "./Menu.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const SECTIONS = [
  {
    label: "Milk Teas",
    names: [
      "Classic Milk Tea", "Jasmine Green Milk Tea", "Taro Milk Tea",
      "Thai Milk Tea", "Honey Milk Tea", "Brown Sugar Milk Tea",
      "Strawberry Milk Tea", "Wintermelon Milk Tea", "Coffee Milk Tea",
      "Coconut Milk Tea", "Chocolate Milk Tea", "Oreo Milk Tea", "March Milk Tea"
    ]
  },
  {
    label: "Fruit, Green & Oolong Teas",
    names: [
      "Mango Green Tea", "Passion Fruit Tea", "Lychee Green Tea",
      "Peach Oolong Tea", "Wintermelon Tea", "Honey Lemon Tea", "Mint Tea"
    ]
  },
  {
    label: "Specialties & Other Drinks",
    names: ["Matcha Latte", "Fresh Milk", "Jayden Special"]
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
