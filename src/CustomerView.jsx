import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const TAX_RATE = 0.0825;
const CARD_COLORS = ["#ff6b9d", "#c77dff", "#06d6a0", "#ffd166", "#4cc9f0", "#ff9f1c", "#f72585", "#4361ee"];

const cardColor = (id) => CARD_COLORS[id % CARD_COLORS.length];

const SECTIONS = [
    {
        key: "milk-teas",
        label: "Milk Teas",
        gradient: "#ff6b9d, #c77dff",
        names: [
            "Classic Milk Tea", "Jasmine Green Milk Tea", "Taro Milk Tea", "Thai Milk Tea",
            "Honey Milk Tea", "Brown Sugar Milk Tea", "Strawberry Milk Tea", "Wintermelon Milk Tea",
            "Coffee Milk Tea", "Coconut Milk Tea", "Chocolate Milk Tea", "Oreo Milk Tea", "March Milk Tea",
        ],
    },
    {
        key: "fruit-teas",
        label: "Fruit, Green, & Oolong Teas",
        gradient: "#06d6a0, #4cc9f0",
        names: [
            "Mango Green Tea", "Passion Fruit Tea", "Lychee Green Tea", "Peach Oolong Tea",
            "Wintermelon Tea", "Honey Lemon Tea", "Mint Tea",
        ],
    },
    {
        key: "specialties",
        label: "Specialties & Other Drinks",
        gradient: "#ffd166, #ff9f1c",
        names: ["Matcha Latte", "Matcha Dreamcicle", "Jayden Special", "Fresh Milk"],
    },
    {
        key: "toppings",
        label: "Toppings / Add-ons",
        gradient: "#ff9f1c, #ef233c",
        names: ["Boba Pearls", "Lychee Jelly"],
    },
];

const ICE_OPTIONS = ["No Ice", "Light Ice"];
const SUGAR_OPTIONS = ["No Sugar", "Light Sugar", "Extra Sugar"];

export default function CustomerView() {
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState("CARD");
    const [paying, setPaying] = useState(false);
    const [toast, setToast] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState(null);
    const [selectedIce, setSelectedIce] = useState(null);
    const [selectedSugar, setSelectedSugar] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/menu`);
                if (!res.ok) throw new Error("Failed to load menu");
                const data = await res.json();
                setMenuItems(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2800);
    }, []);

    const addToCart = (item) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.id === item.id);
            if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { ...item, qty: 1 }];
        });
        showToast(`Added ${item.name}!`);
    };

    const changeQty = (id, delta) => {
        setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c).filter((c) => c.qty > 0));
    };

    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const fmt = (n) => `$${n.toFixed(2)}`;

    // --- Grouping Logic ---
    const grouped = SECTIONS.map((section) => ({
        ...section,
        items: menuItems.filter((item) => 
            section.names.map(n => n.toLowerCase()).includes(item.name.toLowerCase().trim())
        ),
    }));

    // Filter for the "New" section: Must NOT be in grouped sections AND NOT be an ice/sugar option
    const ungrouped = menuItems.filter((item) => {
        const itemName = item.name.toLowerCase().trim();
        const isCategorized = SECTIONS.some((s) => 
            s.names.map(n => n.toLowerCase()).includes(itemName)
        );
        const isCustomization = [...ICE_OPTIONS, ...SUGAR_OPTIONS]
            .map(n => n.toLowerCase())
            .includes(itemName);

        return !isCategorized && !isCustomization;
    });

    if (loading) return <div className="kiosk-root"><div className="kiosk-loading"><div className="kiosk-spinner" /><span>Loading menu…</span></div></div>;
    if (error) return <div className="kiosk-root"><div className="kiosk-loading" style={{ color: "#ff6b9d" }}>⚠ {error}</div></div>;

    if (orderSuccess) return (
        <div className="kiosk-root">
            <div className="kiosk-success">
                <div className="kiosk-success-icon">🎉</div>
                <h2>Order Placed!</h2>
                <div className="kiosk-success-order">Order #{orderNumber}</div>
                <button className="kiosk-new-order-btn" onClick={() => { setOrderSuccess(false); setOrderNumber(null); }}>Start New Order</button>
            </div>
        </div>
    );

    return (
        <div className="kiosk-root">
            <header className="kiosk-header">
                <div className="kiosk-brand">
                    <span className="kiosk-brand-icon">🧋</span>
                    <div>
                        <div className="kiosk-brand-name">Austin's Boba Shop</div>
                        <div className="kiosk-brand-sub">Order Here</div>
                    </div>
                </div>
                <div className="kiosk-header-right">
                    <button className="kiosk-back-btn" onClick={() => navigate("/")}>← Back</button>
                    <button className="kiosk-cart-btn" onClick={() => cart.length > 0 ? setShowPayModal(true) : showToast("Add something first!")}>
                        🛒 View Cart {cart.length > 0 && <span className="cart-badge">{cart.reduce((s, c) => s + c.qty, 0)}</span>}
                    </button>
                </div>
            </header>

            <div className="kiosk-hero">
                <h1>What are you craving?</h1>
                <p>Tap any drink to add it to your order</p>
            </div>

            <div className="kiosk-body">
                <div className="kiosk-menu">
                    {/* --- New/Uncategorized Section --- */}
                    {ungrouped.length > 0 && (
                        <div className="kiosk-section">
                            <div className="kiosk-section-heading">
                                <h2 className="kiosk-section-title" style={{ backgroundImage: "linear-gradient(135deg, #f72585, #7209b7)" }}>
                                    New Arrivals
                                </h2>
                            </div>
                            <div className="kiosk-grid">
                                {ungrouped.map((item) => (
                                    <div key={item.id} className="kiosk-card" onClick={() => addToCart(item)}>
                                        <div className="kiosk-card-banner" style={{ background: cardColor(item.id) }} />
                                        <div className="kiosk-card-body">
                                            <div className="kiosk-card-name">{item.name}</div>
                                            <div className="kiosk-card-footer">
                                                <span className="kiosk-card-price">{fmt(item.price)}</span>
                                                <button className="kiosk-card-add" style={{ background: cardColor(item.id) }}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- Standard Categorized Sections --- */}
                    {grouped.map((section) => section.items.length > 0 && (
                        <div key={section.key} className="kiosk-section">
                            <div className="kiosk-section-heading">
                                <h2 className="kiosk-section-title" style={{ backgroundImage: `linear-gradient(135deg, ${section.gradient})` }}>
                                    {section.label}
                                </h2>
                            </div>
                            <div className="kiosk-grid">
                                {section.items.map((item) => {
                                    const inCart = cart.find((c) => c.id === item.id);
                                    return (
                                        <div key={item.id} className="kiosk-card" onClick={() => addToCart(item)}>
                                            <div className="kiosk-card-banner" style={{ background: cardColor(item.id) }} />
                                            <div className="kiosk-card-body">
                                                <div className="kiosk-card-name">{item.name}</div>
                                                <div className="kiosk-card-footer">
                                                    <span className="kiosk-card-price">{fmt(item.price)}</span>
                                                    <button className="kiosk-card-add" style={{ background: cardColor(item.id) }}>+</button>
                                                </div>
                                            </div>
                                            {inCart && <div className="kiosk-card-tag">In Cart: {inCart.qty}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* --- Customizations --- */}
                    <div className="kiosk-section">
                        <div className="kiosk-section-heading">
                            <h2 className="kiosk-section-title" style={{ backgroundImage: "linear-gradient(135deg, #4cc9f0, #4361ee)" }}>
                                Ice & Sugar Customizations
                            </h2>
                        </div>
                        <div className="kiosk-custom-panel">
                            <div className="kiosk-custom-group">
                                <div className="kiosk-custom-group-label">Ice Level</div>
                                <div className="kiosk-custom-options">
                                    {ICE_OPTIONS.map((opt) => (
                                        <label key={opt} className="kiosk-custom-option">
                                            <input type="radio" name="ice" checked={selectedIce === opt} onChange={() => setSelectedIce(opt)} />
                                            <span className="kiosk-custom-radio-box" />
                                            <span className="kiosk-custom-option-label">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="kiosk-custom-group">
                                <div className="kiosk-custom-group-label">Sugar Level</div>
                                <div className="kiosk-custom-options">
                                    {SUGAR_OPTIONS.map((opt) => (
                                        <label key={opt} className="kiosk-custom-option">
                                            <input type="radio" name="sugar" checked={selectedSugar === opt} onChange={() => setSelectedSugar(opt)} />
                                            <span className="kiosk-custom-radio-box" />
                                            <span className="kiosk-custom-option-label">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="kiosk-cart">
                    <h2 className="kiosk-cart-title">Your Order</h2>
                    <div className="kiosk-cart-items">
                        {cart.length === 0 ? <p>Nothing here yet!</p> : cart.map((item) => (
                            <div key={item.id} className="kiosk-cart-item">
                                <div className="kiosk-cart-item-info">
                                    <div className="kiosk-cart-item-name">{item.name}</div>
                                    <div className="kiosk-cart-item-price">{fmt(item.price)}</div>
                                </div>
                                <div className="kiosk-cart-item-controls">
                                    <button className="kiosk-qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                                    <span className="kiosk-qty-num">{item.qty}</span>
                                    <button className="kiosk-qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="kiosk-cart-totals">
                            <div className="kiosk-totals-row"><span>Total</span><span>{fmt(total)}</span></div>
                            <button className="kiosk-order-btn" onClick={() => setShowPayModal(true)}>Place Order →</button>
                        </div>
                    )}
                </aside>
            </div>

            {toast && <div className="kiosk-toast">{toast}</div>}
        </div>
    );
}