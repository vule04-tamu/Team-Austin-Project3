import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    defaultCustomizationSelection,
    ensureIceSugarDefaults,
    isExclusiveCategory,
    selectExclusiveInCategory,
    sortOptionsForDisplay,
} from "./customizationUtils";
import "./CashierView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

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

function newLineId() {
    return crypto.randomUUID();
}

export default function CashierView() {
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    const [customizationOptions, setCustomizationOptions] = useState([]);
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

    const [customizeModal, setCustomizeModal] = useState(null);
    const [pendingCustomIds, setPendingCustomIds] = useState([]);
    const [pendingSize, setPendingSize] = useState("regular");

    useEffect(() => {
        (async () => {
            try {
                const [menuRes, optRes] = await Promise.all([
                    fetch(`${API_BASE}/api/menu`),
                    fetch(`${API_BASE}/api/menu/customizations`),
                ]);
                if (!menuRes.ok) throw new Error("Failed to load menu");
                const data = await menuRes.json();
                setMenuItems(data);

                if (optRes.ok) {
                    const opts = await optRes.json();
                    setCustomizationOptions(opts);
                } else {
                    setCustomizationOptions([]);
                }

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

    const optionsByCategory = useMemo(() => {
        const m = new Map();
        for (const o of customizationOptions) {
            const k = o.category || "Other";
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(o);
        }
        return m;
    }, [customizationOptions]);

    const sizeMap = useMemo(() => {
        const m = new Map();
        const LARGE = " (Large)";
        for (const item of menuItems) {
            if (item.name.endsWith(LARGE)) {
                const base = item.name.slice(0, -LARGE.length);
                if (!m.has(base)) m.set(base, {});
                m.get(base).large = item;
            } else {
                if (!m.has(item.name)) m.set(item.name, {});
                m.get(item.name).regular = item;
            }
        }
        return m;
    }, [menuItems]);

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2800);
    }, []);

    const lineUnitPrice = useCallback(
        (line) => {
            let p = Number(line.price) || 0;
            for (const id of line.customizationIds || []) {
                const opt = customizationOptions.find((o) => o.id === id);
                if (opt) p += Number(opt.priceModifier) || 0;
            }
            return p;
        },
        [customizationOptions],
    );

    const pushLine = useCallback((item, customizationIds) => {
        setCart((prev) => {
            const hasMods = (customizationIds || []).length > 0;
            const customizable = Boolean(item.customizable);
            if (!customizable && !hasMods) {
                const existing = prev.find(
                    (c) =>
                        c.id === item.id &&
                        !(c.customizationIds && c.customizationIds.length),
                );
                if (existing) {
                    return prev.map((c) =>
                        c.lineId === existing.lineId
                            ? { ...c, qty: c.qty + selectedQty }
                            : c,
                    );
                }
            }
            return [
                ...prev,
                {
                    ...item,
                    lineId: newLineId(),
                    qty: selectedQty,
                    customizationIds: [...(customizationIds || [])],
                },
            ];
        });
    }, [selectedQty]);

    const onMenuCardClick = (item) => {
        const variants = sizeMap.get(item.name);
        const hasLarge = variants?.large != null;
        if (item.customizable || hasLarge) {
            setCustomizeModal({ item, variants: hasLarge ? variants : null });
            setPendingSize("regular");
            setPendingCustomIds(
                item.customizable
                    ? defaultCustomizationSelection(customizationOptions)
                    : [],
            );
            return;
        }
        pushLine(item, []);
    };

    const confirmCustomize = () => {
        if (!customizeModal) return;
        const ids = customizeModal.item.customizable
            ? ensureIceSugarDefaults(pendingCustomIds, customizationOptions)
            : pendingCustomIds;
        const actualItem =
            pendingSize === "large" && customizeModal.variants?.large
                ? customizeModal.variants.large
                : customizeModal.item;
        pushLine(actualItem, ids);
        setCustomizeModal(null);
        setPendingCustomIds([]);
        setPendingSize("regular");
    };

    const handleCustomizationClick = useCallback(
        (category, optionId) => {
            if (isExclusiveCategory(category)) {
                setPendingCustomIds((prev) =>
                    selectExclusiveInCategory(
                        prev,
                        customizationOptions,
                        category,
                        optionId,
                    ),
                );
            } else {
                setPendingCustomIds((prev) =>
                    prev.includes(optionId)
                        ? prev.filter((x) => x !== optionId)
                        : [...prev, optionId],
                );
            }
        },
        [customizationOptions],
    );

    const changeQty = (lineId, delta) => {
        setCart((prev) =>
            prev
                .map((c) =>
                    c.lineId === lineId ? { ...c, qty: c.qty + delta } : c,
                )
                .filter((c) => c.qty > 0),
        );
    };

    const removeItem = (lineId) =>
        setCart((prev) => prev.filter((c) => c.lineId !== lineId));

    const subtotal = cart.reduce((s, c) => s + lineUnitPrice(c) * c.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const fmt = (n) => `$${n.toFixed(2)}`;

    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cart: cart.map((c) => ({
                        menuItemId: c.id,
                        price: lineUnitPrice(c),
                        qty: c.qty,
                        customizationIds: c.customizationIds || [],
                    })),
                    paymentMethod: payMethod,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Order failed");
            }
            setCart([]);
            setShowPayModal(false);
            showToast("✓ Order placed successfully!");
        } catch (e) {
            showToast("✗ " + e.message);
        } finally {
            setPaying(false);
        }
    };

    const baseItems = useMemo(
        () => menuItems.filter((i) => !i.name.endsWith(" (Large)")),
        [menuItems],
    );
    const visibleItems =
        activeCategory === "All Items" || activeCategory === null
            ? baseItems
            : baseItems.filter(
                  (i) => (i.category || "All Items") === activeCategory,
              );

    const customizationSummary = (line) => {
        const ids = line.customizationIds || [];
        if (!ids.length) return null;
        return ids
            .map((id) => customizationOptions.find((o) => o.id === id)?.name)
            .filter(Boolean)
            .join(", ");
    };

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
                        cart.map((item) => {
                            const csum = customizationSummary(item);
                            return (
                            <div key={item.lineId} className="order-item-row">
                                <div
                                    className="order-item-color"
                                    style={{ background: itemColor(item.id) }}
                                />
                                <div className="order-item-info">
                                    <div className="order-item-name">
                                        {item.name}
                                    </div>
                                    {csum && (
                                        <div className="order-item-note">
                                            {csum}
                                        </div>
                                    )}
                                </div>
                                <div className="order-item-qty">
                                    <button
                                        type="button"
                                        className="qty-btn"
                                        onClick={() =>
                                            changeQty(item.lineId, -1)
                                        }
                                    >
                                        −
                                    </button>
                                    <span className="qty-num">
                                        x{item.qty}
                                    </span>
                                    <button
                                        type="button"
                                        className="qty-btn"
                                        onClick={() =>
                                            changeQty(item.lineId, 1)
                                        }
                                    >
                                        +
                                    </button>
                                </div>
                                <span className="order-item-price">
                                    {fmt(lineUnitPrice(item) * item.qty)}
                                </span>
                                <button
                                    type="button"
                                    className="remove-item-btn"
                                    onClick={() => removeItem(item.lineId)}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                            );
                        })
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
                        type="button"
                        className="btn-save"
                        onClick={() => showToast("Order saved!")}
                        disabled={cart.length === 0}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="btn-pay"
                        onClick={() => setShowPayModal(true)}
                        disabled={cart.length === 0}
                    >
                        Pay
                    </button>
                </div>
            </aside>

            <nav className="category-sidebar">
                {categories.map((cat) => (
                    <button
                        type="button"
                        key={cat}
                        className={`category-btn ${activeCategory === cat ? "active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        <div className="category-indicator" />
                        <span className="category-text">{cat}</span>
                    </button>
                ))}
            </nav>

            <main className="menu-panel">
                <div className="menu-toolbar">
                    <span className="toolbar-label">QTY</span>
                    <div className="qty-selector">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <button
                                type="button"
                                key={n}
                                className={`qty-pill ${selectedQty === n ? "selected" : ""}`}
                                onClick={() => setSelectedQty(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="toolbar-custom-label logout-btn"
                        onClick={() => navigate("/")}
                    >
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
                                    role="button"
                                    tabIndex={0}
                                    className={`menu-card ${item.customizable ? "customizable" : ""}`}
                                    onClick={() => onMenuCardClick(item)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ")
                                            onMenuCardClick(item);
                                    }}
                                    title={
                                        item.customizable
                                            ? "Tap to customize"
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

            {customizeModal && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setCustomizeModal(null);
                            setPendingCustomIds([]);
                            setPendingSize("regular");
                        }
                    }}
                >
                    <div className="modal-card customize-modal-card">
                        <p className="modal-title">
                            Customize — {customizeModal.item.name}
                        </p>
                        <p className="modal-section-label">
                            {customizeModal.variants ? "Pick a size" : ""}
                            {customizeModal.variants && customizeModal.item.customizable ? " · " : ""}
                            {customizeModal.item.customizable ? "ice & sugar (one each) · toppings optional" : ""}
                        </p>
                        <div className="customize-groups">
                            {customizeModal.variants && (
                                <div className="customize-group">
                                    <div className="customize-cat-label">
                                        Size
                                        <span className="customize-cat-hint"> — pick one</span>
                                    </div>
                                    <div
                                        className="customize-chips customize-chips-exclusive"
                                        role="radiogroup"
                                        aria-label="Size"
                                    >
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={pendingSize === "regular"}
                                            className={`customize-chip ${pendingSize === "regular" ? "active" : ""}`}
                                            onClick={() => setPendingSize("regular")}
                                        >
                                            Regular — {fmt(customizeModal.item.price)}
                                        </button>
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={pendingSize === "large"}
                                            className={`customize-chip ${pendingSize === "large" ? "active" : ""}`}
                                            onClick={() => setPendingSize("large")}
                                        >
                                            Large — {fmt(customizeModal.variants.large.price)}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {customizeModal.item.customizable && [...optionsByCategory.entries()].map(
                                ([cat, opts]) => (
                                    <div key={cat} className="customize-group">
                                        <div className="customize-cat-label">
                                            {cat}
                                            {isExclusiveCategory(cat) && (
                                                <span className="customize-cat-hint">
                                                    {" "}
                                                    — pick one
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={
                                                isExclusiveCategory(cat)
                                                    ? "customize-chips customize-chips-exclusive"
                                                    : "customize-chips"
                                            }
                                            role={
                                                isExclusiveCategory(cat)
                                                    ? "radiogroup"
                                                    : undefined
                                            }
                                            aria-label={cat}
                                        >
                                            {sortOptionsForDisplay(
                                                cat,
                                                opts,
                                            ).map((o) => (
                                                <button
                                                    type="button"
                                                    key={o.id}
                                                    role={
                                                        isExclusiveCategory(cat)
                                                            ? "radio"
                                                            : undefined
                                                    }
                                                    aria-checked={
                                                        isExclusiveCategory(cat)
                                                            ? pendingCustomIds.includes(
                                                                  o.id,
                                                              )
                                                            : undefined
                                                    }
                                                    className={`customize-chip ${pendingCustomIds.includes(o.id) ? "active" : ""}`}
                                                    onClick={() =>
                                                        handleCustomizationClick(
                                                            cat,
                                                            o.id,
                                                        )
                                                    }
                                                >
                                                    {o.name}
                                                    {Number(o.priceModifier) >
                                                        0 && (
                                                        <span className="chip-price">
                                                            {" "}
                                                            +
                                                            {fmt(
                                                                o.priceModifier,
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-cancel-btn"
                                onClick={() => {
                                    setCustomizeModal(null);
                                    setPendingCustomIds([]);
                                    setPendingSize("regular");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-confirm-btn"
                                onClick={confirmCustomize}
                            >
                                Add to order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPayModal && (
                <div
                    className="modal-backdrop"
                    role="presentation"
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
                                    type="button"
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
                                type="button"
                                className="modal-cancel-btn"
                                onClick={() => setShowPayModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
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

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
