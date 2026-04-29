import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLanguage } from "./LanguageSwitch";
import AccessibilityDrawer from "./AccessibilityDrawer.jsx";
import "./KioskAccessibility.css";
import {
    defaultCustomizationSelection,
    ensureIceSugarDefaults,
    isExclusiveCategory,
    selectExclusiveInCategory,
    sortOptionsForDisplay,
} from "./customizationUtils";
import "./CustomerView.css";
import "./BobaCupAnimation.css";
import BobaCupAnimation from "./BobaCupAnimation";
import Chatbot from './Chatbot'

const API_BASE = import.meta.env.VITE_API_URL || "";

const CONTRAST_LS_KEY = "kioskAccessibilityContrastPct";

const TAX_RATE = 0.0825;

const CARD_COLORS = [
    "#ff6b9d", "#c77dff", "#06d6a0", "#ffd166",
    "#4cc9f0", "#ff9f1c", "#f72585", "#4361ee",
];

const cardColor = (id) => CARD_COLORS[id % CARD_COLORS.length];

const SECTIONS = [
    {
        key: "milk-teas",
        labelKey: "sec_milk_teas",
        tabKey: "sec_milk_teas",
        gradient: "#ff6b9d, #c77dff",
        names: [
            "Classic Milk Tea", "Jasmine Green Milk Tea", "Taro Milk Tea", "Thai Milk Tea",
            "Honey Milk Tea", "Brown Sugar Milk Tea", "Strawberry Milk Tea", "Wintermelon Milk Tea",
            "Coffee Milk Tea", "Coconut Milk Tea", "Chocolate Milk Tea", "Oreo Milk Tea", "March Milk Tea",
        ],
    },
    {
        key: "fruit-teas",
        labelKey: "sec_fruit_teas",
        tabKey: "sec_fruit_tab",
        gradient: "#06d6a0, #4cc9f0",
        names: [
            "Mango Green Tea", "Passion Fruit Tea", "Lychee Green Tea", "Peach Oolong Tea",
            "Wintermelon Tea", "Honey Lemon Tea", "Mint Tea",
        ],
    },
    {
        key: "hot-drinks",
        labelKey: "sec_hot_drinks",
        tabKey: "sec_hot_drinks_tab",
        gradient: "#ff9f1c, #ef476f",
        names: ["Hot Classic Milk Tea", "Hot Honey Lemon Tea", "Hot Matcha Latte", "Hot Coffee"],
    },
    {
        key: "specialties",
        labelKey: "sec_specialties",
        tabKey: "sec_specialties_tab",
        gradient: "#ffd166, #ff9f1c",
        names: ["Matcha Latte", "jayden special", "Fresh Milk"],
    },
];

const HOT_DRINK_NAMES = new Set(
    SECTIONS.find((section) => section.key === "hot-drinks")?.names || [],
);

function newLineId() {
    return crypto.randomUUID();
}

export default function CustomerView() {
    const { language, t } = useLanguage();

    const [menuItems, setMenuItems] = useState([]);
    const [customizationOptions, setCustomizationOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [cart, setCart] = useState([]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState("CARD");
    const [paying, setPaying] = useState(false);
    const [toast, setToast] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderNumber, setOrderNumber] = useState(null);

    const [customizeModal, setCustomizeModal] = useState(null);
    const [pendingCustomIds, setPendingCustomIds] = useState([]);
    const [pendingSize, setPendingSize] = useState("regular");
    const [menuTab, setMenuTab] = useState(SECTIONS[0].key);

    const isHotDrink = useCallback((item) => HOT_DRINK_NAMES.has(item.name), []);
    const shouldIncludeIce = useCallback((item) => !HOT_DRINK_NAMES.has(item.name), []);

    const contrastLayerRef = useRef(null);
    const [contrastPct, setContrastPct] = useState(100);

    useEffect(() => {
        const raw = localStorage.getItem(CONTRAST_LS_KEY);
        if (raw != null) {
            const v = parseInt(raw, 10);
            if (!Number.isNaN(v)) {
                setContrastPct(Math.min(200, Math.max(50, v)));
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(CONTRAST_LS_KEY, String(contrastPct));
    }, [contrastPct]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const params = new URLSearchParams({ lang: language });
                const [menuRes, optRes] = await Promise.all([
                    fetch(`${API_BASE}/api/menu?${params.toString()}`),
                    fetch(`${API_BASE}/api/menu/customizations?${params.toString()}`),
                ]);
                if (!menuRes.ok) throw new Error("Failed to load menu");
                const [data, optionData] = await Promise.all([
                    menuRes.json(),
                    optRes.ok ? optRes.json() : Promise.resolve([]),
                ]);
                if (cancelled) return;
                setMenuItems(data);
                setCustomizationOptions(optionData);
            } catch (e) {
                if (cancelled) return;
                setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [language]);

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

    const displayMenuNameById = useMemo(() => {
        const m = new Map();
        for (const item of menuItems) {
            m.set(item.id, item.displayName || item.name);
        }
        return m;
    }, [menuItems]);

    const displayMenuNameByName = useMemo(() => {
        const m = new Map();
        for (const item of menuItems) {
            if (!m.has(item.name)) {
                m.set(item.name, item.displayName || item.name);
            }
        }
        return m;
    }, [menuItems]);

    const displayCustomizationNameById = useMemo(() => {
        const m = new Map();
        for (const option of customizationOptions) {
            m.set(option.id, option.displayName || option.name);
        }
        return m;
    }, [customizationOptions]);

    const displayCustomizationCategoryByName = useMemo(() => {
        const m = new Map();
        for (const option of customizationOptions) {
            if (!m.has(option.category)) {
                m.set(option.category, option.displayCategory || option.category);
            }
        }
        return m;
    }, [customizationOptions]);

    const getDisplayMenuName = useCallback(
        (item) =>
            displayMenuNameById.get(item.id) ||
            item.displayName ||
            displayMenuNameByName.get(item.name) ||
            item.name,
        [displayMenuNameById, displayMenuNameByName],
    );

    const getDisplayCustomizationCategory = useCallback(
        (category) =>
            displayCustomizationCategoryByName.get(category) || category,
        [displayCustomizationCategoryByName],
    );

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

    const pushLine = useCallback((item, customizationIds, silent = false) => {
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
                            ? { ...c, qty: c.qty + 1 }
                            : c,
                    );
                }
            }
            return [
                ...prev,
                {
                    ...item,
                    lineId: newLineId(),
                    qty: 1,
                    customizationIds: [...(customizationIds || [])],
                },
            ];
        });
        if (!silent) showToast(t("added_item", { item: getDisplayMenuName(item) }));
    }, [getDisplayMenuName, showToast, t]);

    const handleSurpriseMe = useCallback(() => {
        const drinkSectionKeys = ["milk-teas", "fruit-teas", "hot-drinks", "specialties"];
        const drinkItems = menuItems.filter((item) =>
            SECTIONS.some(
                (s) => drinkSectionKeys.includes(s.key) && s.names.includes(item.name)
            )
        );
        if (!drinkItems.length) {
            showToast("No drinks available right now!");
            return;
        }

        const baseItems = drinkItems.filter((item) => !item.name.endsWith(" (Large)"));
        const pool = baseItems.length ? baseItems : drinkItems;
        const item = pool[Math.floor(Math.random() * pool.length)];

        const variants = sizeMap.get(item.name);
        const useSize = variants?.large && Math.random() > 0.5 ? "large" : "regular";
        const actualItem =
            useSize === "large" && variants?.large ? variants.large : item;

        let customIds = [];
        if (item.customizable && customizationOptions.length) {
            for (const [cat, opts] of optionsByCategory.entries()) {
                if (isExclusiveCategory(cat)) {
                    const pick = opts[Math.floor(Math.random() * opts.length)];
                    customIds.push(pick.id);
                } else {
                    const shuffled = [...opts].sort(() => Math.random() - 0.5);
                    const count = Math.floor(Math.random() * (shuffled.length + 1));
                    customIds.push(...shuffled.slice(0, count).map((o) => o.id));
                }
            }
            customIds = ensureIceSugarDefaults(customIds, customizationOptions, {
                includeIce: shouldIncludeIce(item),
            });
        }

        pushLine(actualItem, customIds, true);
        showToast(`Surprise! ${getDisplayMenuName(actualItem)} added!`);
    }, [
        menuItems, sizeMap, customizationOptions, optionsByCategory,
        pushLine, getDisplayMenuName, showToast,
    ]);

    const onDrinkClick = (item) => {
        const variants = sizeMap.get(item.name);
        const hasLarge = variants?.large != null;
        if (item.customizable || hasLarge) {
            setCustomizeModal({ item, variants: hasLarge ? variants : null });
            setPendingSize("regular");
            setPendingCustomIds(
                item.customizable
                    ? defaultCustomizationSelection(customizationOptions, {
                          includeIce: shouldIncludeIce(item),
                      })
                    : [],
            );
            return;
        }
        pushLine(item, []);
    };

    const confirmCustomize = () => {
        if (!customizeModal) return;
        const ids = customizeModal.item.customizable
            ? ensureIceSugarDefaults(pendingCustomIds, customizationOptions, {
                  includeIce: shouldIncludeIce(customizeModal.item),
              })
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

    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    const subtotal = cart.reduce((s, c) => s + lineUnitPrice(c) * c.qty, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const fmt = (n) => `$${n.toFixed(2)}`;

    const customizationSummary = (line) => {
        const ids = line.customizationIds || [];
        if (!ids.length) return null;
        return ids
            .map((id) => displayCustomizationNameById.get(id))
            .filter(Boolean)
            .join(", ");
    };

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
            setOrderNumber(data.orderNumber ?? data.orderId ?? Math.floor(1000 + Math.random() * 9000));
            setCart([]);
            setShowPayModal(false);
            setOrderSuccess(true);
        } catch (e) {
            showToast("Error: " + e.message);
        } finally {
            setPaying(false);
        }
    };

    const grouped = useMemo(() => {
        const otherSectionNames = new Set(
            SECTIONS.filter((section) => section.key !== "specialties")
                .flatMap((section) => section.names),
        );
        const LARGE = " (Large)";
        const baseNames = new Set(
            menuItems
                .filter((item) => item.name.endsWith(LARGE))
                .map((item) => item.name.slice(0, -LARGE.length)),
        );

        return SECTIONS.map((section) => ({
            ...section,
            items: menuItems.filter((item) => {
                // Exclude non-drink items like "No Ice", "No Sugar", etc.
                if (item.name.toLowerCase().includes('ice')) return false;
                if (item.name.toLowerCase().includes('sugar')) return false;
                if (item.name.toLowerCase().includes('boba') || item.name.toLowerCase().includes('jelly')) return false;

                if (item.name.endsWith(LARGE) && baseNames.has(item.name.slice(0, -LARGE.length))) {
                    return false;
                }
                if (section.key === "specialties") {
                    return !otherSectionNames.has(item.name);
                }
                return section.names.includes(item.name);
            }),
        }));
    }, [menuItems]);

    useEffect(() => {
        const tabOk = grouped.some(
            (s) => s.key === menuTab && s.items.length > 0,
        );
        if (tabOk) return;
        const first = grouped.find((s) => s.items.length > 0);
        if (first) setMenuTab(first.key);
    }, [grouped, menuTab]);

    const activeSection = grouped.find((s) => s.key === menuTab);
    const visibleSections = useMemo(
        () => grouped.filter((s) => s.items.length > 0),
        [grouped],
    );

    const handleMenuTabKeyDown = useCallback((event, sectionKey) => {
        const currentIndex = visibleSections.findIndex((s) => s.key === sectionKey);
        if (currentIndex === -1) return;

        let nextIndex = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % visibleSections.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + visibleSections.length) % visibleSections.length;
        } else if (event.key === "Home") {
            nextIndex = 0;
        } else if (event.key === "End") {
            nextIndex = visibleSections.length - 1;
        }

        if (nextIndex == null) return;

        event.preventDefault();
        const nextSection = visibleSections[nextIndex];
        setMenuTab(nextSection.key);
        requestAnimationFrame(() => {
            document.getElementById(`kiosk-menu-tab-${nextSection.key}`)?.focus();
        });
    }, [visibleSections]);

    const contrastStyle = { filter: `contrast(${contrastPct}%)` };

    // ── Derive cup animation props from current customizeModal state ──
    const cupSectionKey = useMemo(() => {
        if (!customizeModal) return "milk-teas";
        const sec = SECTIONS.find((s) => s.names.includes(customizeModal.item.name));
        return sec ? sec.key : "milk-teas";
    }, [customizeModal]);

    const cupIceLevel = useMemo(() => {
        if (customizeModal && !shouldIncludeIce(customizeModal.item)) {
            return "No Ice";
        }
        for (const [cat, opts] of optionsByCategory.entries()) {
            if (cat.toLowerCase().includes("ice")) {
                const selected = opts.find((o) => pendingCustomIds.includes(o.id));
                if (selected) return selected.displayName || selected.name;
            }
        }
        return "Regular Ice";
    }, [optionsByCategory, pendingCustomIds, customizeModal, shouldIncludeIce]);

    const cupToppingIds = useMemo(() => {
        for (const [cat, opts] of optionsByCategory.entries()) {
            if (cat.toLowerCase().includes("topping")) {
                const toppingOptionIds = new Set(opts.map((o) => o.id));
                return pendingCustomIds.filter((id) => toppingOptionIds.has(id));
            }
        }
        return [];
    }, [optionsByCategory, pendingCustomIds]);

    const a11yChrome = (
        <AccessibilityDrawer
            contrastPct={contrastPct}
            onContrastChange={setContrastPct}
        />
    );

    if (loading) {
        return (
            <div className="kiosk-root">
                {a11yChrome}
                <main
                    ref={contrastLayerRef}
                    className="kiosk-contrast-layer"
                    style={contrastStyle}
                >
                    <div className="kiosk-contrast-mag-inner">
                        <div className="kiosk-loading">
                            <div className="kiosk-spinner" aria-hidden="true" />
                            <span>{t("loading_menu")}</span>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="kiosk-root">
                {a11yChrome}
                <main
                    ref={contrastLayerRef}
                    className="kiosk-contrast-layer"
                    style={contrastStyle}
                >
                    <div className="kiosk-contrast-mag-inner">
                        <div className="kiosk-loading" style={{ color: "#ff6b9d" }}>
                            {error}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="kiosk-root">
                {a11yChrome}
                <main
                    ref={contrastLayerRef}
                    className="kiosk-contrast-layer"
                    style={contrastStyle}
                    aria-labelledby="kiosk-order-success-heading"
                >
                    <div className="kiosk-contrast-mag-inner">
                        <div className="kiosk-success">
                            <h2 id="kiosk-order-success-heading">{t("order_placed")}</h2>
                            <p>{t("thank_you")}</p>
                            <div className="kiosk-success-order">
                                {t("order_number")}
                                {orderNumber}
                            </div>
                            <button
                                type="button"
                                className="kiosk-new-order-btn"
                                onClick={() => {
                                    setOrderSuccess(false);
                                    setOrderNumber(null);
                                }}
                            >
                                {t("start_new")}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="kiosk-root">
            <Chatbot />
            <header className="kiosk-header">
                <div className="kiosk-brand">
                    <div>
                        <div className="kiosk-brand-name">{t('shop_name')}</div>
                        <div className="kiosk-brand-sub">{t('order_here')}</div>
                    </div>
                </div>
            </header>

            {a11yChrome}

            <main
                ref={contrastLayerRef}
                className="kiosk-contrast-layer"
                style={contrastStyle}
                aria-labelledby="kiosk-welcome-heading"
            >
            <div className="kiosk-contrast-mag-inner">
            <section className="kiosk-hero kiosk-hero-compact" aria-labelledby="kiosk-welcome-heading">
                <h1 id="kiosk-welcome-heading">{t('welcome')}</h1>
                <p>{t('pick_category')}</p>
            </section>

            <div className="kiosk-body">
                <section className="kiosk-menu-column">
                    <div className="kiosk-menu-tabs" role="tablist" aria-label={t("menu_categories")}>
                        {grouped.map((section) => {
                            if (section.items.length === 0) return null;
                            const selected = menuTab === section.key;
                            const tabId = `kiosk-menu-tab-${section.key}`;
                            return (
                                <button
                                    key={section.key}
                                    id={tabId}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    aria-controls="kiosk-menu-panel"
                                    tabIndex={selected ? 0 : -1}
                                    className={`kiosk-menu-tab ${selected ? "kiosk-menu-tab-active" : ""}`}
                                    style={
                                        selected
                                            ? { backgroundImage: `linear-gradient(135deg, ${section.gradient})` }
                                            : undefined
                                    }
                                    onClick={() => setMenuTab(section.key)}
                                    onKeyDown={(event) => handleMenuTabKeyDown(event, section.key)}
                                >
                                    {t(section.tabKey)}
                                </button>
                            );
                        })}
                    </div>
                    <div
                        id="kiosk-menu-panel"
                        className="kiosk-menu-tab-panel"
                        role="tabpanel"
                        aria-labelledby={activeSection ? `kiosk-menu-tab-${activeSection.key}` : undefined}
                    >
                        {activeSection && activeSection.items.length > 0 ? (
                            <div className="kiosk-grid">
                                {activeSection.items.map((item) => {
                                    const inCart = cart.find(
                                        (c) =>
                                            c.id === item.id &&
                                            !(c.customizationIds?.length),
                                    );
                                    const color = cardColor(item.id);
                                    return (
                                        <button
                                            type="button"
                                            key={item.id}
                                            className="kiosk-card"
                                            onClick={() => onDrinkClick(item)}
                                        >
                                            <div
                                                className="kiosk-card-banner"
                                                aria-hidden="true"
                                                style={{ background: color }}
                                            />
                                            <div className="kiosk-card-body">
                                                <div className="kiosk-card-name">
                                                    {getDisplayMenuName(item)}
                                                </div>
                                                <div className="kiosk-card-footer">
                                                    <span className="kiosk-card-price">
                                                        {fmt(item.price)}
                                                    </span>
                                                    <span
                                                        className="kiosk-card-add"
                                                        aria-hidden="true"
                                                        style={{ background: color }}
                                                    >
                                                        +
                                                    </span>
                                                </div>
                                            </div>
                                            {item.customizable &&
                                                customizationOptions.length > 0 && (
                                                    <div className="kiosk-card-tag subtle">
                                                        {t('tap_to_customize')}
                                                    </div>
                                                )}
                                            {inCart && !item.customizable && (
                                                <div className="kiosk-card-tag">
                                                    {t('in_cart')}: {inCart.qty}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="kiosk-tab-empty">{t('no_drinks_cat')}</p>
                        )}
                    </div>
                </section>

                <aside className="kiosk-cart">
                    <div className="kiosk-cart-header">
                        <h2 className="kiosk-cart-title">{t('your_order')}</h2>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                                type="button"
                                className="kiosk-surprise-btn"
                                onClick={handleSurpriseMe}
                            >
                                {t('Surprise Me!') || 'Surprise Me!'}
                            </button>
                            {totalItems > 0 && (
                                <span className="kiosk-cart-count">
                                    {totalItems} {totalItems !== 1 ? t('items') : t('item')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="kiosk-cart-items">
                        {cart.length === 0 ? (
                            <div className="kiosk-cart-empty">
                                <p>{t('cart_empty_1')}<br />{t('cart_empty_2')}</p>
                            </div>
                        ) : (
                            cart.map((item) => {
                                const csum = customizationSummary(item);
                                return (
                                <div key={item.lineId} className="kiosk-cart-item">
                                    <div
                                        className="kiosk-cart-item-dot"
                                        aria-hidden="true"
                                        style={{ background: cardColor(item.id) }}
                                    />
                                    <div className="kiosk-cart-item-info">
                                        <div className="kiosk-cart-item-name">{getDisplayMenuName(item)}</div>
                                        {csum && (
                                            <div className="kiosk-cart-item-custom">{csum}</div>
                                        )}
                                        <div className="kiosk-cart-item-price">{fmt(lineUnitPrice(item))} {t('each')}</div>
                                    </div>
                                    <div className="kiosk-cart-item-controls">
                                        <button
                                            type="button"
                                            className="kiosk-qty-btn"
                                            aria-label={`−, Decrease ${getDisplayMenuName(item)} quantity`}
                                            onClick={() => changeQty(item.lineId, -1)}
                                        >
                                            −
                                        </button>
                                        <span className="kiosk-qty-num">{item.qty}</span>
                                        <button
                                            type="button"
                                            className="kiosk-qty-btn"
                                            aria-label={`+, Increase ${getDisplayMenuName(item)} quantity`}
                                            onClick={() => changeQty(item.lineId, 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>

                    {cart.length > 0 && (
                        <>
                            <div className="kiosk-cart-totals">
                                <div className="kiosk-totals-row">
                                    <span className="kiosk-totals-label">{t('subtotal')}</span>
                                    <span className="kiosk-totals-val">{fmt(subtotal)}</span>
                                </div>
                                <div className="kiosk-totals-row">
                                    <span className="kiosk-totals-label">{t('tax')}</span>
                                    <span className="kiosk-totals-val">{fmt(tax)}</span>
                                </div>
                                <hr className="kiosk-totals-divider" />
                                <div className="kiosk-totals-total">
                                    <span className="kiosk-totals-total-label">{t('total')}</span>
                                    <span className="kiosk-totals-total-val">{fmt(total)}</span>
                                </div>
                            </div>
                            <button type="button" className="kiosk-order-btn" onClick={() => setShowPayModal(true)}>
                                {t('place_order')}
                            </button>
                        </>
                    )}
                </aside>
            </div>
            </div>

            {/* ── Customize Modal (wide, with boba cup) ── */}
            {customizeModal && (
                <div
                    className="kiosk-modal-backdrop"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setCustomizeModal(null);
                            setPendingCustomIds([]);
                            setPendingSize("regular");
                        }
                    }}
                >
                    <div className="kiosk-modal kiosk-customize-modal kiosk-customize-modal--wide">

                        {/* Left column: animated boba cup */}
                        <div className="kiosk-customize-cup-col">
                            <BobaCupAnimation
                                itemName={customizeModal.item.name}
                                sectionKey={cupSectionKey}
                                size={pendingSize}
                                iceLevel={cupIceLevel}
                                toppingIds={cupToppingIds}
                                customizationOptions={customizationOptions}
                            />
                        </div>

                        {/* Right column: controls */}
                        <div className="kiosk-customize-controls-col">
                            <p className="kiosk-modal-title">
                                {t('customize')} {getDisplayMenuName(customizeModal.item)}
                            </p>
                            <p className="kiosk-modal-label">
                                {customizeModal.variants ? t('pick_size') : ""}
                                {customizeModal.variants && customizeModal.item.customizable ? " · " : ""}
                                {customizeModal.item.customizable && shouldIncludeIce(customizeModal.item)
                                    ? t('ice_sugar_hint')
                                    : ""}
                            </p>
                            <div className="kiosk-customize-scroll">
                                {customizeModal.variants && (
                                    <div className="kiosk-customize-block">
                                        <div className="kiosk-customize-cat">
                                            {t('size')}
                                            <span className="kiosk-customize-cat-hint">{t('one_only')}</span>
                                        </div>
                                        <div
                                            className="kiosk-customize-chips kiosk-customize-chips-exclusive"
                                            role="radiogroup"
                                            aria-label={t("size_option_group")}
                                        >
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={pendingSize === "regular"}
                                                className={`kiosk-chip ${pendingSize === "regular" ? "on" : ""}`}
                                                onClick={() => setPendingSize("regular")}
                                            >
                                                {t('regular')} — {fmt(customizeModal.item.price)}
                                            </button>
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={pendingSize === "large"}
                                                className={`kiosk-chip ${pendingSize === "large" ? "on" : ""}`}
                                                onClick={() => setPendingSize("large")}
                                            >
                                                {t('large')} — {fmt(customizeModal.variants.large.price)}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {customizeModal.item.customizable && [...optionsByCategory.entries()]
                                    .filter(([cat]) => shouldIncludeIce(customizeModal.item) || cat !== "Ice Level")
                                    .map(([cat, opts]) => (
                                    <div key={cat} className="kiosk-customize-block">
                                        <div className="kiosk-customize-cat">
                                            {getDisplayCustomizationCategory(cat)}
                                            {isExclusiveCategory(cat) && (
                                                <span className="kiosk-customize-cat-hint">
                                                    {t('one_only')}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={
                                                isExclusiveCategory(cat)
                                                    ? "kiosk-customize-chips kiosk-customize-chips-exclusive"
                                                    : "kiosk-customize-chips"
                                            }
                                            role={isExclusiveCategory(cat) ? "radiogroup" : undefined}
                                            aria-label={getDisplayCustomizationCategory(cat)}
                                        >
                                            {sortOptionsForDisplay(cat, opts).map((o) => (
                                                <button
                                                    type="button"
                                                    key={o.id}
                                                    role={isExclusiveCategory(cat) ? "radio" : undefined}
                                                    aria-checked={
                                                        isExclusiveCategory(cat)
                                                            ? pendingCustomIds.includes(o.id)
                                                            : undefined
                                                    }
                                                    className={`kiosk-chip ${pendingCustomIds.includes(o.id) ? "on" : ""}`}
                                                    onClick={() => handleCustomizationClick(cat, o.id)}
                                                >
                                                    {displayCustomizationNameById.get(o.id) || o.displayName || o.name}
                                                    {Number(o.priceModifier) > 0 && (
                                                        <span> +{fmt(o.priceModifier)}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="kiosk-modal-actions">
                                <button
                                    type="button"
                                    className="kiosk-modal-cancel"
                                    onClick={() => {
                                        setCustomizeModal(null);
                                        setPendingCustomIds([]);
                                        setPendingSize("regular");
                                    }}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="kiosk-modal-confirm"
                                    onClick={confirmCustomize}
                                >
                                    {t('add_to_cart')}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ── Payment Modal ── */}
            {showPayModal && (
                <div
                    className="kiosk-modal-backdrop"
                    role="presentation"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false); }}
                >
                    <div className="kiosk-modal">
                        <p className="kiosk-modal-title">{t('almost_there')}</p>
                        <p className="kiosk-modal-total">{fmt(total)}</p>

                        <p className="kiosk-modal-label">{t('how_to_pay')}</p>
                        <div className="kiosk-pay-methods">
                            {[
                                { key: "CASH",   label: t('pay_cash'),   icon: "💵" },
                                { key: "CARD",   label: t('pay_card'),   icon: "💳" },
                                { key: "MOBILE", label: t('pay_mobile'), icon: "📱" },
                            ].map((m) => (
                                <button
                                    type="button"
                                    key={m.key}
                                    className={`kiosk-pay-btn ${payMethod === m.key ? "active" : ""}`}
                                    onClick={() => setPayMethod(m.key)}
                                >
                                    <span className="pay-icon" aria-hidden="true">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div className="kiosk-modal-actions">
                            <button type="button" className="kiosk-modal-cancel" onClick={() => setShowPayModal(false)}>
                                {t('go_back')}
                            </button>
                            <button
                                type="button"
                                className="kiosk-modal-confirm"
                                onClick={handlePay}
                                disabled={paying}
                            >
                                {paying ? t('processing') : t('confirm_order')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="kiosk-toast">{toast}</div>}
            </main>
        </div>
    );
}
