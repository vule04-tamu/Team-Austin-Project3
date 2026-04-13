import { useState, useEffect } from "react";
import "./Menu.css";

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
    names: ["Matcha Latte", "Fresh Milk", "Jayden Special", "Matcha Dreamcicle"]
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
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/menu");
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

  if (loading) return <div className="menu-wrap"><p className="menu-status">Loading menu…</p></div>;
  if (error)   return <div className="menu-wrap"><p className="menu-status menu-error">Error: {error}</p></div>;

  const byName = Object.fromEntries(menuItems.map(item => [item.name, item]));

  return (
    <div className="menu-wrap">
      <header className="menu-header">
        <h1 className="shop-name">Boba Shop</h1>
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-dot" />
          <span className="divider-line" />
        </div>
        <p className="shop-tagline">Handcrafted drinks · Made with love</p>
      </header>

      {SECTIONS.map(({ label, names }) => {
        const items = names.map(n => byName[n]).filter(Boolean);
        if (items.length === 0) return null;
        return (
          <section key={label} className="menu-section">
            <div className="section-header">
              <h2 className="section-label">{label}</h2>
              <span className="section-line" />
            </div>
            <div className="items-grid">
              {items.map((item) => (
                <div key={item.id} className="item-card">
                  <p className="item-name">{item.name}</p>
                  <div className="item-footer">
                    <span className="item-price">${item.price.toFixed(2)}</span>
                    {item.customization && (
                      <span className="item-badge">Customizable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <p className="footer-note">All drinks can be customized · Ask your barista</p>
    </div>
  );
}