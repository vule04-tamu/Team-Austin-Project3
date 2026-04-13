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
        <h1>Menu</h1>
      </header>

      {Object.keys(grouped).length === 0 ? (
        <p className="menu-status">No menu items available.</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="menu-section">
            <h2 className="section-title">{category}</h2>
            {items.map((item) => (
              <div key={item.id} className="menu-row">
                <div className="row-left">
                  <p className="item-name">{item.name}</p>
                </div>
                <div className="row-right">
                  {item.customization && (
                    <span className="badge">Customizable</span>
                  )}
                  <span className="item-price">${item.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}