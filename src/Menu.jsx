import { useState, useEffect } from "react";
import "./Menu.css";

export default function Menu() {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/menu");
                if (!response.ok) {
                    throw new Error("Failed to fetch menu");
                }
                const data = await response.json();
                setMenuItems(data);
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
            <div className="menu-container">
                <p>Loading menu...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="menu-container">
                <p className="error">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="menu-container">
            <h1>Menu</h1>
            <div className="menu-grid">
                {menuItems.length === 0 ? (
                    <p>No menu items available</p>
                ) : (
                    menuItems.map((item) => (
                        <div key={item.id} className="menu-item">
                            <h3>{item.name}</h3>
                            <p className="price">${item.price.toFixed(2)}</p>
                            {item.customization && (
                                <span className="customizable-badge">
                                    Customizable
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
