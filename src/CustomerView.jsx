import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const TAX_RATE = 0.0825;

// Assign a vivid gradient + emoji to each category
const CATEGORY_STYLES = [
    { gradient: "#ff6b9d, #c77dff", emoji: "🧋" },
    { gradient: "#06d6a0, #4cc9f0", emoji: "🍵" },
    { gradient: "#ffd166, #ff9f1c", emoji: "🍑" },
    { gradient: "#ff9f1c, #ef233c", emoji: "🍓" },
    { gradient: "#4cc9f0, #4361ee", emoji: "🫧" },
    { gradient: "#c77dff, #7b2ff7", emoji: "🍇" },
    { gradient: "#06d6a0, #1a9e8a", emoji: "🍈" },
];

// Card accent colors cycling through the palette
const CARD_COLORS = [
    "#ff6b9d",
    "#c77dff",
    "#06d6a0",
    "#ffd166",
    "#4cc9f0",
    "#ff9f1c",
    "#f72585",
    "#4361ee",
];

// Map items to a repeating emoji set for visual richness
const ITEM_EMOJIS = ["🧋", "🍵", "🥤", "🍹", "🧃", "🍶", "🫖", "🍧", "🍨", "🧊"];

const cardColor = (id) => CARD_COLORS[id % CARD_COLORS.length];
const itemEmoji = (id) => ITEM_EMOJIS[id % ITEM_EMOJIS.length];

export default function CustomerView() {
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [cart, setCart] = useState([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState("CARD");
    const [paying, setPaying] = useState(false);
    const [toast, setToast] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState(null);

    // ── Fetch menu ────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/menu`);
                if (!res.ok) throw new Error("Failed to load menu");
                const data = await res.json();
                setMenuItems(data);

                const cats = [
                    "All",
                    ...new Set(data.map((i) => i.category || "Other")),
                ];
                setCategories(cats);
                setActiveCategory("All");
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

    // ── Cart helpers ──────────────────────────────────
    const addToCart = (item) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.id === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.id === item.id ? { ...c, qty: c.qty + 1 } : c,
                );
            }
            return [...prev, { ...item, qty: 1 }];
        });
        showToast(`Added ${item.name}! 🎉`);
    };

    const changeQty = (id, delta) => {
        setCart((prev) =>
            prev
                .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
                .filter((c) => c.qty > 0),
        );
    };

    // ── Totals ────────────────────────────────────────
    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const fmt = (n) => `$${n.toFixed(2)}`;

    // ── Submit order ──────────────────────────────────
    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cart: cart.map((c) => ({
                        menuItemId: c.id,
                        price: c.price,
                        qty: c.qty,
                    })),
                    paymentMethod: payMethod,
                }),
            });
            if (!res.ok) throw new Error("Order failed");
            const data = await res.json().catch(() => ({}));
            setOrderNumber(data.orderNumber || Math.floor(1000 + Math.random() * 9000));
            setCart([]);
            setShowPayModal(false);
            setOrderSuccess(true);
        } catch (e) {
            showToast("✗ " + e.message);
        } finally {
            setPaying(false);
        }
    };

    // ── Filtered items ────────────────────────────────
    const visibleItems =
        activeCategory === "All" || activeCategory === null
            ? menuItems
            : menuItems.filter(
                  (i) => (i.category || "Other") === activeCategory,
              );

    // ── Loading / Error ───────────────────────────────
    if (loading)
        return (
            <div className="kiosk-root">
                <div className="kiosk-loading">
                    <div className="kiosk-spinner" />
                    <span>Loading menu…</span>
                </div>
            </div>
        );

    if (error)
        return (
            <div className="kiosk-root">
                <div className="kiosk-loading" style={{ color: "#ff6b9d" }}>
                    ⚠ {error}
                </div>
            </div>
        );

    // ── Order success screen ──────────────────────────
    if (orderSuccess)
        return (
            <div className="kiosk-root">
                <div className="kiosk-success">
                    <div className="kiosk-success-icon">🎉</div>
                    <h2>Order Placed!</h2>
                    <p>Your boba is being prepared with love ✨</p>
                    <div className="kiosk-success-order">
                        Order #{orderNumber}
                    </div>
                    <button
                        className="kiosk-new-order-btn"
                        onClick={() => {
                            setOrderSuccess(false);
                            setOrderNumber(null);
                        }}
                    >
                        Start New Order
                    </button>
                </div>
            </div>
        );

    return (
        <div className="kiosk-root">
            {/* ── Header ── */}
            <header className="kiosk-header">
                <div className="kiosk-brand">
                    <span className="kiosk-brand-icon">🧋</span>
                    <div>
                        <div className="kiosk-brand-name">Austin's Boba Shop</div>
                        <div className="kiosk-brand-sub">Order Here</div>
                    </div>
                </div>

                <div className="kiosk-header-right">
                    <button
                        className="kiosk-back-btn"
                        onClick={() => navigate("/")}
                    >
                        ← Back
                    </button>
                    <button
                        className="kiosk-cart-btn"
                        onClick={() =>
                            cart.length > 0
                                ? setShowPayModal(true)
                                : showToast("Add something first! 🧋")
                        }
                    >
                        🛒 View Cart
                        {totalItems > 0 && (
                            <span className="cart-badge">{totalItems}</span>
                        )}
                    </button>
                </div>
            </header>

            {/* ── Hero ── */}
            <div className="kiosk-hero">
                <h1>What are you craving? 🤩</h1>
                <p>Tap any drink to add it to your order</p>
            </div>

            {/* ── Category Pills ── */}
            <div className="kiosk-categories">
                {categories.map((cat, idx) => {
                    const style =
                        CATEGORY_STYLES[idx % CATEGORY_STYLES.length];
                    return (
                        <button
                            key={cat}
                            className={`cat-pill ${activeCategory === cat ? "active" : ""}`}
                            onClick={() => setActiveCategory(cat)}
                            style={
                                activeCategory === cat
                                    ? {
                                          background: `linear-gradient(135deg, ${style.gradient})`,
                                      }
                                    : {}
                            }
                        >
                            <span className="cat-pill-icon">
                                {cat === "All" ? "✨" : style.emoji}
                            </span>
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* ── Body: Grid + Cart ── */}
            <div className="kiosk-body">
                {/* Menu Grid */}
                <div className="kiosk-menu">
                    {visibleItems.length === 0 ? (
                        <p style={{ color: "rgba(255,255,255,0.4)", padding: "20px", fontWeight: 600 }}>
                            No items here yet!
                        </p>
                    ) : (
                        <div className="kiosk-grid">
                            {visibleItems.map((item) => {
                                const color = cardColor(item.id);
                                const inCart = cart.find((c) => c.id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className="kiosk-card"
                                        onClick={() => addToCart(item)}
                                    >
                                        <div
                                            className="kiosk-card-banner"
                                            style={{ background: color }}
                                        />
                                        <div className="kiosk-card-body">
                                            <span className="kiosk-card-emoji">
                                                {itemEmoji(item.id)}
                                            </span>
                                            <div className="kiosk-card-name">
                                                {item.name}
                                            </div>
                                            <div className="kiosk-card-footer">
                                                <span className="kiosk-card-price">
                                                    {fmt(item.price)}
                                                </span>
                                                <button
                                                    className="kiosk-card-add"
                                                    style={{ background: color }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(item);
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        {inCart && (
                                            <div className="kiosk-card-tag">
                                                In Cart: {inCart.qty}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cart Panel */}
                <aside className="kiosk-cart">
                    <div className="kiosk-cart-header">
                        <h2 className="kiosk-cart-title">Your Order</h2>
                        {totalItems > 0 && (
                            <span className="kiosk-cart-count">
                                {totalItems} item{totalItems !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    <div className="kiosk-cart-items">
                        {cart.length === 0 ? (
                            <div className="kiosk-cart-empty">
                                <div className="kiosk-cart-empty-icon">🥤</div>
                                <p>
                                    Nothing here yet!
                                    <br />
                                    Tap a drink to add it.
                                </p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="kiosk-cart-item">
                                    <div
                                        className="kiosk-cart-item-dot"
                                        style={{ background: cardColor(item.id) }}
                                    />
                                    <div className="kiosk-cart-item-info">
                                        <div className="kiosk-cart-item-name">
                                            {item.name}
                                        </div>
                                        <div className="kiosk-cart-item-price">
                                            {fmt(item.price)} each
                                        </div>
                                    </div>
                                    <div className="kiosk-cart-item-controls">
                                        <button
                                            className="kiosk-qty-btn"
                                            onClick={() => changeQty(item.id, -1)}
                                        >
                                            −
                                        </button>
                                        <span className="kiosk-qty-num">
                                            {item.qty}
                                        </span>
                                        <button
                                            className="kiosk-qty-btn"
                                            onClick={() => changeQty(item.id, 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

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

                            <button
                                className="kiosk-order-btn"
                                onClick={() => setShowPayModal(true)}
                            >
                                Place Order →
                            </button>
                        </>
                    )}
                </aside>
            </div>

            {/* ── Payment Modal ── */}
            {showPayModal && (
                <div
                    className="kiosk-modal-backdrop"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowPayModal(false);
                    }}
                >
                    <div className="kiosk-modal">
                        <p className="kiosk-modal-title">Almost there! 🎉</p>
                        <p className="kiosk-modal-total">{fmt(total)}</p>

                        <p className="kiosk-modal-label">How would you like to pay?</p>
                        <div className="kiosk-pay-methods">
                            {[
                                { key: "CASH", label: "Cash", icon: "💵" },
                                { key: "CARD", label: "Card", icon: "💳" },
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
                            <button
                                className="kiosk-modal-cancel"
                                onClick={() => setShowPayModal(false)}
                            >
                                Go Back
                            </button>
                            <button
                                className="kiosk-modal-confirm"
                                onClick={handlePay}
                                disabled={paying}
                            >
                                {paying ? "Processing…" : `Confirm Order`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && <div className="kiosk-toast">{toast}</div>}
        </div>
    );
}
