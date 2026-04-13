import { useState, useEffect } from "react";
import "./Menu.css";

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});
}

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

  const grouped = groupByCategory(menuItems);

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

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="menu-section">
          <div className="section-header">
            <h2 className="section-label">{category}</h2>
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
      ))}

      <p className="footer-note">All drinks can be customized · Ask your barista</p>
    </div>
  );
}