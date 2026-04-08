import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const TAX_RATE = 0.0825;

// Static menu sections 
const MENU_SECTIONS = [
    {
        key: "milk-teas",
        label: "Milk Teas",
        emoji: "🧋",
        gradient: "#ff6b9d, #c77dff",
        items: [
            "Classic Milk Tea",
            "Jasmine Green Milk Tea",
            "Taro Milk Tea",
            "Thai Milk Tea",
            "Honey Milk Tea",
            "Brown Sugar Milk Tea",
            "Strawberry Milk Tea",
            "Wintermelon Milk Tea",
            "Coffee Milk Tea",
            "Coconut Milk Tea",
            "Chocolate Milk Tea",
            "Oreo Milk Tea",
            "March Milk Tea",
        ],
    },
    {
        key: "fruit-teas",
        label: "Fruit, Green, & Oolong Teas",
        emoji: "🍵",
        gradient: "#06d6a0, #4cc9f0",
        items: [
            "Mango Green Tea",
            "Passion Fruit Tea",
            "Lychee Green Tea",
            "Peach Oolong Tea",
            "Wintermelon Tea",
            "Honey Lemon Tea",
            "Mint Tea",
        ],
    },
    {
        key: "specialties",
        label: "Specialties & Other Drinks",
        emoji: "✨",
        gradient: "#ffd166, #ff9f1c",
        items: ["Matcha Latte", "Matcha Dreamcicle", "Jayden Special", "Fresh Milk"],
    },
    {
        key: "toppings",
        label: "Toppings / Add-ons",
        emoji: "🍮",
        gradient: "#ff9f1c, #ef233c",
        items: ["Boba Pearls", "Lychee Jelly"],
    },
];

const CARD_COLORS = [
    "#ff6b9d","#c77dff","#06d6a0","#ffd166",
    "#4cc9f0","#ff9f1c","#f72585","#4361ee",
];
const ITEM_EMOJIS = ["🧋","🍵","🥤","🍹","🧃","🍶","🫖","🍧","🍨","🧊"];

const cardColor  = (id) => CARD_COLORS[id % CARD_COLORS.length];
const itemEmoji  = (id) => ITEM_EMOJIS[id % ITEM_EMOJIS.length];

// Ice / Sugar options
const ICE_OPTIONS   = ["No Ice", "Light Ice"];
const SUGAR_OPTIONS = ["No Sugar", "Light Sugar", "Extra Sugar"];

export default function CustomerView() {
    const navigate = useNavigate();

    const [menuItems, setMenuItems]       = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);

    const [cart, setCart]                 = useState([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod]       = useState("CARD");
    const [paying, setPaying]             = useState(false);
    const [toast, setToast]               = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber]   = useState(null);

    // Ice / Sugar customization (single selection each, null = default/normal)
    const [selectedIce,   setSelectedIce]   = useState(null);
    const [selectedSugar, setSelectedSugar] = useState(null);

    // Fetch menu
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

    // Cart helpers 
    const addToCart = (item) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.id === item.id);
            if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { ...item, qty: 1 }];
        });
        showToast(`Added ${item.name}! 🎉`);
    };

    const changeQty = (id, delta) => {
        setCart((prev) =>
            prev.map((c) => c.id === id ? { ...c, qty: c.qty + delta } : c)
                .filter((c) => c.qty > 0),
        );
    };

    // Totals
    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    const subtotal   = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const tax        = subtotal * TAX_RATE;
    const total      = subtotal + tax;
    const fmt        = (n) => `$${n.toFixed(2)}`;

    // Submit order
    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cart: cart.map((c) => ({ menuItemId: c.id, price: c.price, qty: c.qty })),
                    paymentMethod: payMethod,
                    customizations: { ice: selectedIce, sugar: selectedSugar },
                }),
            });
            if (!res.ok) throw new Error("Order failed");
            const data = await res.json().catch(() => ({}));
            setOrderNumber(data.orderNumber || Math.floor(1000 + Math.random() * 9000));
            setCart([]);
            setSelectedIce(null);
            setSelectedSugar(null);
            setShowPayModal(false);
            setOrderSuccess(true);
        } catch (e) {
            showToast("✗ " + e.message);
        } finally {
            setPaying(false);
        }
    };

    //  Helpers: resolve a menu item from API data by name 
    const getItemByName = (name) => menuItems.find((m) => m.name === name);

    // Loading / Error 
    if (loading) return (
        <div className="kiosk-root">
            <div className="kiosk-loading">
                <div className="kiosk-spinner" />
                <span>Loading menu…</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="kiosk-root">
            <div className="kiosk-loading" style={{ color: "#ff6b9d" }}>⚠ {error}</div>
        </div>
    );

    // Order success
    if (orderSuccess) return (
        <div className="kiosk-root">
            <div className="kiosk-success">
                <div className="kiosk-success-icon">🎉</div>
                <h2>Order Placed!</h2>
                <p>Your boba is being prepared with love ✨</p>
                <div className="kiosk-success-order">Order #{orderNumber}</div>
                <button className="kiosk-new-order-btn" onClick={() => { setOrderSuccess(false); setOrderNumber(null); }}>
                    Start New Order
                </button>
            </div>
        </div>
    );

    return (
        <div className="kiosk-root">
            {/* Header */}
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
                    <button
                        className="kiosk-cart-btn"
                        onClick={() => cart.length > 0 ? setShowPayModal(true) : showToast("Add something first! 🧋")}
                    >
                        🛒 View Cart
                        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                    </button>
                </div>
            </header>

            {/* Hero */}
            <div className="kiosk-hero">
                <h1>What are you craving? 🤩</h1>
                <p>Tap any drink to add it to your order</p>
            </div>

            {/*  Body: Sections + Cart  */}
            <div className="kiosk-body">
                {/* Menu Sections */}
                <div className="kiosk-menu">
                    {MENU_SECTIONS.map((section) => (
                        <div key={section.key} className="kiosk-section">
                            {/* Section heading */}
                            <div className="kiosk-section-heading">
                                <span className="kiosk-section-emoji">{section.emoji}</span>
                                <h2
                                    className="kiosk-section-title"
                                    style={{ backgroundImage: `linear-gradient(135deg, ${section.gradient})` }}
                                >
                                    {section.label}
                                </h2>
                            </div>

                            {/* Cards */}
                            <div className="kiosk-grid">
                                {section.items.map((name, idx) => {
                                    const apiItem = getItemByName(name);
                                    // Use API data if available, otherwise display as unavailable
                                    const color   = cardColor(idx);
                                    const inCart  = apiItem ? cart.find((c) => c.id === apiItem.id) : null;

                                    return (
                                        <div
                                            key={name}
                                            className={`kiosk-card ${!apiItem ? "kiosk-card--unavailable" : ""}`}
                                            onClick={() => apiItem && addToCart(apiItem)}
                                        >
                                            <div className="kiosk-card-banner" style={{ background: color }} />
                                            <div className="kiosk-card-body">
                                                <span className="kiosk-card-emoji">{itemEmoji(idx)}</span>
                                                <div className="kiosk-card-name">{name}</div>
                                                <div className="kiosk-card-footer">
                                                    <span className="kiosk-card-price">
                                                        {apiItem ? fmt(apiItem.price) : "—"}
                                                    </span>
                                                    {apiItem && (
                                                        <button
                                                            className="kiosk-card-add"
                                                            style={{ background: color }}
                                                            onClick={(e) => { e.stopPropagation(); addToCart(apiItem); }}
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {inCart && (
                                                <div className="kiosk-card-tag">In Cart: {inCart.qty}</div>
                                            )}
                                            {!apiItem && (
                                                <div className="kiosk-card-tag kiosk-card-tag--unavail">Coming soon</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Ice & Sugar Customization  */}
                    <div className="kiosk-section">
                        <div className="kiosk-section-heading">
                            <span className="kiosk-section-emoji">🧊</span>
                            <h2
                                className="kiosk-section-title"
                                style={{ backgroundImage: "linear-gradient(135deg, #4cc9f0, #4361ee)" }}
                            >
                                Ice &amp; Sugar Customizations
                            </h2>
                        </div>

                        <div className="kiosk-custom-panel">
                            {/* Ice */}
                            <div className="kiosk-custom-group">
                                <div className="kiosk-custom-group-label">🧊 Ice</div>
                                <div className="kiosk-custom-options">
                                    {ICE_OPTIONS.map((opt) => (
                                        <label key={opt} className="kiosk-custom-option">
                                            <input
                                                type="radio"
                                                name="ice"
                                                checked={selectedIce === opt}
                                                onChange={() => setSelectedIce(selectedIce === opt ? null : opt)}
                                                onClick={() => { if (selectedIce === opt) setSelectedIce(null); }}
                                            />
                                            <span className="kiosk-custom-radio-box" />
                                            <span className="kiosk-custom-option-label">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sugar */}
                            <div className="kiosk-custom-group">
                                <div className="kiosk-custom-group-label">🍬 Sugar</div>
                                <div className="kiosk-custom-options">
                                    {SUGAR_OPTIONS.map((opt) => (
                                        <label key={opt} className="kiosk-custom-option">
                                            <input
                                                type="radio"
                                                name="sugar"
                                                checked={selectedSugar === opt}
                                                onChange={() => setSelectedSugar(selectedSugar === opt ? null : opt)}
                                                onClick={() => { if (selectedSugar === opt) setSelectedSugar(null); }}
                                            />
                                            <span className="kiosk-custom-radio-box" />
                                            <span className="kiosk-custom-option-label">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Cart Panel */}
                <aside className="kiosk-cart">
                    <div className="kiosk-cart-header">
                        <h2 className="kiosk-cart-title">Your Order</h2>
                        {totalItems > 0 && (
                            <span className="kiosk-cart-count">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                        )}
                    </div>

                    <div className="kiosk-cart-items">
                        {cart.length === 0 ? (
                            <div className="kiosk-cart-empty">
                                <div className="kiosk-cart-empty-icon">🥤</div>
                                <p>Nothing here yet!<br />Tap a drink to add it.</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="kiosk-cart-item">
                                    <div className="kiosk-cart-item-dot" style={{ background: cardColor(item.id) }} />
                                    <div className="kiosk-cart-item-info">
                                        <div className="kiosk-cart-item-name">{item.name}</div>
                                        <div className="kiosk-cart-item-price">{fmt(item.price)} each</div>
                                    </div>
                                    <div className="kiosk-cart-item-controls">
                                        <button className="kiosk-qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                                        <span className="kiosk-qty-num">{item.qty}</span>
                                        <button className="kiosk-qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Customization summary in cart */}
                    {(selectedIce || selectedSugar) && (
                        <div className="kiosk-cart-customizations">
                            <div className="kiosk-cart-custom-title">🧊 Customizations</div>
                            {selectedIce   && <div className="kiosk-cart-custom-tag">🧊 {selectedIce}</div>}
                            {selectedSugar && <div className="kiosk-cart-custom-tag">🍬 {selectedSugar}</div>}
                        </div>
                    )}

                    {cart.length > 0 && (
                        <>
                            <div className="kiosk-cart-totals">
                                <div className="kiosk-totals-row">
                                    <span className="kiosk-totals-label">Subtotal</span>
                                    <span className="kiosk-totals-val">{fmt(subtotal)}</span>
                                </div>
                                <div className="kiosk-totals-row">
                                    <span className="kiosk-totals-label">Tax (8.25%)</span>
                                    <span className="kiosk-totals-val">{fmt(tax)}</span>
                                </div>
                                <hr className="kiosk-totals-divider" />
                                <div className="kiosk-totals-total">
                                    <span className="kiosk-totals-total-label">Total</span>
                                    <span className="kiosk-totals-total-val">{fmt(total)}</span>
                                </div>
                            </div>
                            <button className="kiosk-order-btn" onClick={() => setShowPayModal(true)}>
                                Place Order →
                            </button>
                        </>
                    )}
                </aside>
            </div>

            {/* Payment Modal */}
            {showPayModal && (
                <div
                    className="kiosk-modal-backdrop"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false); }}
                >
                    <div className="kiosk-modal">
                        <p className="kiosk-modal-title">Almost there! 🎉</p>
                        <p className="kiosk-modal-total">{fmt(total)}</p>

                        {/* Show customizations in modal */}
                        {(selectedIce || selectedSugar) && (
                            <div className="kiosk-modal-custom-summary">
                                {selectedIce   && <span className="kiosk-modal-custom-tag">🧊 {selectedIce}</span>}
                                {selectedSugar && <span className="kiosk-modal-custom-tag">🍬 {selectedSugar}</span>}
                            </div>
                        )}

                        <p className="kiosk-modal-label">How would you like to pay?</p>
                        <div className="kiosk-pay-methods">
                            {[
                                { key: "CASH",   label: "Cash",   icon: "💵" },
                                { key: "CARD",   label: "Card",   icon: "💳" },
                                { key: "MOBILE", label: "Mobile", icon: "📱" },
                            ].map((m) => (
                                <button
                                    key={m.key}
                                    className={`kiosk-pay-btn ${payMethod === m.key ? "active" : ""}`}
                                    onClick={() => setPayMethod(m.key)}
                                >
                                    <span className="pay-icon">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="kiosk-modal-actions">
                            <button className="kiosk-modal-cancel" onClick={() => setShowPayModal(false)}>Go Back</button>
                            <button className="kiosk-modal-confirm" onClick={handlePay} disabled={paying}>
                                {paying ? "Processing…" : "Confirm Order"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/*  Toast  */}
            {toast && <div className="kiosk-toast">{toast}</div>}
        </div>
    );
}
