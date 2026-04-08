import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom'
import "./CashierView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Deterministic color per item id
const ITEM_COLORS = [
    "#f59e0b",
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#84cc16",
];
const itemColor = (id) => ITEM_COLORS[id % ITEM_COLORS.length];

const TAX_RATE = 0.0825;

export default function CashierView() {
    const navigate = useNavigate()
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [cart, setCart] = useState([]);
    const [selectedQty, setSelectedQty] = useState(1);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState("CARD");
    const [paying, setPaying] = useState(false);
    const [toast, setToast] = useState(null);

    // ── Fetch menu ────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/menu`);
                if (!res.ok) throw new Error("Failed to load menu");
                const data = await res.json();
                setMenuItems(data);

                // Build unique category list — using first word as mock section
                // In a real app the menu_items table would have a category column
                const cats = [
                    ...new Set(data.map((i) => i.category || "All Items")),
                ];
                setCategories(cats);
                setActiveCategory(cats[0] ?? null);
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
                    c.id === item.id ? { ...c, qty: c.qty + selectedQty } : c,
                );
            }
            return [...prev, { ...item, qty: selectedQty }];
        });
    };

    const changeQty = (id, delta) => {
        setCart((prev) =>
            prev
                .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
                .filter((c) => c.qty > 0),
        );
    };

    const removeItem = (id) =>
        setCart((prev) => prev.filter((c) => c.id !== id));

    // ── Totals ────────────────────────────────────────
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
            setCart([]);
            setShowPayModal(false);
            showToast("✓ Order placed successfully!");
        } catch (e) {
            showToast("✗ " + e.message);
        } finally {
            setPaying(false);
        }
    };

    // ── Filtered menu items ───────────────────────────
    const visibleItems =
        activeCategory === "All Items" || activeCategory === null
            ? menuItems
            : menuItems.filter(
                  (i) => (i.category || "All Items") === activeCategory,
              );

    // ── Render ────────────────────────────────────────
    if (loading)
        return (
            <div className="cashier-root">
                <div className="cashier-loading">
                    <div className="spinner" />
                    <span>Loading menu…</span>
                </div>
            </div>
        );

    if (error)
        return (
            <div className="cashier-root">
                <div className="cashier-loading" style={{ color: "#ef4444" }}>
                    ⚠ {error}
                </div>
            </div>
        );

    return (
        <div className="cashier-root">
            {/* ── LEFT: Order Panel ── */}
            <aside className="order-panel">
                <div className="order-header">
                    <h2>Order</h2>
                    {cart.length > 0 && (
                        <span className="order-count-badge">
                            {cart.reduce((s, c) => s + c.qty, 0)} items
                        </span>
                    )}
                </div>

                <div className="order-items">
                    {cart.length === 0 ? (
                        <div className="order-empty">
                            <div className="order-empty-icon">🧋</div>
                            <p>
                                No items added yet.
                                <br />
                                Select from the menu.
                            </p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="order-item-row">
                                <div
                                    className="order-item-color"
                                    style={{ background: itemColor(item.id) }}
                                />
                                <div className="order-item-info">
                                    <div className="order-item-name">
                                        {item.name}
                                    </div>
                                    {item.customization && (
                                        <div className="order-item-note">
                                            Customizable
                                        </div>
                                    )}
                                </div>
                                <div className="order-item-qty">
                                    <button
                                        className="qty-btn"
                                        onClick={() => changeQty(item.id, -1)}
                                    >
                                        −
                                    </button>
                                    <span className="qty-num">x{item.qty}</span>
                                    <button
                                        className="qty-btn"
                                        onClick={() => changeQty(item.id, 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                <span className="order-item-price">
                                    {fmt(item.price * item.qty)}
                                </span>
                                <button
                                    className="remove-item-btn"
                                    onClick={() => removeItem(item.id)}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="order-totals">
                    <div className="totals-row">
                        <span className="totals-label">Subtotal</span>
                        <span className="totals-value">{fmt(subtotal)}</span>
                    </div>
                    <div className="totals-row">
                        <span className="totals-label">Tax (8.25%)</span>
                        <span className="totals-value">{fmt(tax)}</span>
                    </div>
                    <hr className="totals-divider" />
                    <div className="totals-total-row">
                        <span className="totals-total-label">Total</span>
                        <span className="totals-total-value">{fmt(total)}</span>
                    </div>
                </div>

                <div className="order-actions">
                    <button
                        className="btn-save"
                        onClick={() => showToast("Order saved!")}
                        disabled={cart.length === 0}
                    >
                        Save
                    </button>
                    <button
                        className="btn-pay"
                        onClick={() => setShowPayModal(true)}
                        disabled={cart.length === 0}
                    >
                        Pay
                    </button>
                </div>
            </aside>

            {/* ── MIDDLE: Category Sidebar ── */}
            <nav className="category-sidebar">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        className={`category-btn ${activeCategory === cat ? "active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        <div className="category-indicator" />
                        <span className="category-text">{cat}</span>
                    </button>
                ))}
            </nav>

            {/* ── RIGHT: Menu Grid ── */}
            <main className="menu-panel">
                <div className="menu-toolbar">
                    <span className="toolbar-label">QTY</span>
                    <div className="qty-selector">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <button
                                key={n}
                                className={`qty-pill ${selectedQty === n ? "selected" : ""}`}
                                onClick={() => setSelectedQty(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <button className="toolbar-custom-label logout-btn" onClick={() => navigate('/')} type="button">
                        LOGOUT
                    </button>
                </div>

                <div className="menu-grid-area">
                    {visibleItems.length === 0 ? (
                        <p style={{ color: "#a39f97", padding: "20px" }}>
                            No items in this section.
                        </p>
                    ) : (
                        <div className="menu-grid">
                            {visibleItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`menu-card ${item.customization ? "customizable" : ""}`}
                                    onClick={() => addToCart(item)}
                                    title={
                                        item.customization
                                            ? "Customizable item"
                                            : ""
                                    }
                                >
                                    <div className="menu-card-name">
                                        {item.name}
                                    </div>
                                    <div className="menu-card-price">
                                        {fmt(item.price)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Payment Modal ── */}
            {showPayModal && (
                <div
                    className="modal-backdrop"
                    onClick={(e) => {
                        if (e.target === e.currentTarget)
                            setShowPayModal(false);
                    }}
                >
                    <div className="modal-card">
                        <p className="modal-title">Confirm Payment</p>
                        <p className="modal-total">{fmt(total)}</p>

                        <p className="modal-section-label">Payment Method</p>
                        <div className="payment-methods">
                            {[
                                { key: "CASH", label: "Cash", icon: "💵" },
                                { key: "CARD", label: "Card", icon: "💳" },
                                { key: "MOBILE", label: "Mobile", icon: "📱" },
                            ].map((m) => (
                                <button
                                    key={m.key}
                                    className={`pay-method-btn ${payMethod === m.key ? "active" : ""}`}
                                    onClick={() => setPayMethod(m.key)}
                                >
                                    <span className="icon">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="modal-actions">
                            <button
                                className="modal-cancel-btn"
                                onClick={() => setShowPayModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-confirm-btn"
                                onClick={handlePay}
                                disabled={paying}
                            >
                                {paying
                                    ? "Processing…"
                                    : `Charge ${fmt(total)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
