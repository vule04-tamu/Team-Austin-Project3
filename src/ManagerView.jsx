import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ManagerView.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const SECTIONS = [
    { key: "overview", label: "Overview" },
    { key: "menu", label: "Menu" },
    { key: "inventory", label: "Inventory" },
    { key: "employees", label: "Employees" },
    { key: "reports", label: "Reports" },
];

const todayISO = new Date().toISOString().slice(0, 10);
const isISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtInt = (n) => Number(n || 0).toLocaleString();

export default function ManagerView() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const [actionBusy, setActionBusy] = useState("");

    const [menuItems, setMenuItems] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryReport, setInventoryReport] = useState([]);
    const [usageReport, setUsageReport] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [salesSummary, setSalesSummary] = useState([]);
    const [topSelling, setTopSelling] = useState([]);
    const [xReportRows, setXReportRows] = useState([]);
    const [zTotals, setZTotals] = useState(null);
    const [zAlreadyRun, setZAlreadyRun] = useState(false);
    const [reportsBusy, setReportsBusy] = useState(false);
    const [reportsError, setReportsError] = useState("");

    const [rangeStart, setRangeStart] = useState(todayISO);
    const [rangeEnd, setRangeEnd] = useState(todayISO);
    const [xReportDate, setXReportDate] = useState(todayISO);
    const [overviewUsageStart, setOverviewUsageStart] = useState(todayISO);
    const [overviewUsageEnd, setOverviewUsageEnd] = useState(todayISO);
    const [overviewUsageReport, setOverviewUsageReport] = useState([]);

    const [newMenuName, setNewMenuName] = useState("");
    const [newMenuPrice, setNewMenuPrice] = useState("");
    const [newMenuCustomizable, setNewMenuCustomizable] = useState(false);
    const [newMenuIngredients, setNewMenuIngredients] = useState("");

    const [menuPriceEdits, setMenuPriceEdits] = useState({});
    const [inventorySetEdits, setInventorySetEdits] = useState({});
    const [inventoryAddEdits, setInventoryAddEdits] = useState({});

    const [newEmpUsername, setNewEmpUsername] = useState("");
    const [newEmpPassword, setNewEmpPassword] = useState("");
    const [newEmpRole, setNewEmpRole] = useState("cashier");
    const [employeeEdits, setEmployeeEdits] = useState({});
    const [passwordEdits, setPasswordEdits] = useState({});

    const showToast = useCallback((message) => {
        setToast(message);
        window.setTimeout(() => setToast(""), 2800);
    }, []);

    const apiRequest = useCallback(async (path, options = {}) => {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { "Content-Type": "application/json", ...(options.headers || {}) },
            ...options,
        });
        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }
        if (!res.ok) {
            throw new Error(data?.error || `Request failed (${res.status})`);
        }
        return data;
    }, []);

    const fetchBaseData = useCallback(async () => {
        const [
            menu,
            inventory,
            inventoryLowToHigh,
            employeeRows,
            orders,
            zToday,
            zCheck,
        ] = await Promise.all([
            apiRequest("/api/menu"),
            apiRequest("/api/inventory"),
            apiRequest("/api/inventory/report"),
            apiRequest("/api/employees"),
            apiRequest("/api/orders/recent?limit=25"),
            apiRequest("/api/zreport/today"),
            apiRequest("/api/zreport/check"),
        ]);

        setMenuItems(menu);
        setInventoryItems(inventory);
        setInventoryReport(inventoryLowToHigh);
        setEmployees(employeeRows);
        setRecentOrders(orders);
        setZTotals(zToday);
        setZAlreadyRun(Boolean(zCheck?.alreadyRun));

        setMenuPriceEdits(
            menu.reduce((acc, item) => ({ ...acc, [item.id]: String(item.price) }), {}),
        );
        setInventorySetEdits(
            inventory.reduce((acc, item) => ({ ...acc, [item.id]: String(item.quantity ?? 0) }), {}),
        );
        setEmployeeEdits(
            employeeRows.reduce(
                (acc, item) => ({
                    ...acc,
                    [item.employeeId]: {
                        username: item.username,
                        role: item.role || "cashier",
                    },
                }),
                {},
            ),
        );
    }, [apiRequest]);

    const loadRangeReports = useCallback(async (startDate, endDate) => {
        if (!isISODate(startDate) || !isISODate(endDate) || startDate > endDate) {
            setSalesSummary([]);
            setTopSelling([]);
            setUsageReport([]);
            return;
        }
        const startTs = `${startDate}T00:00:00`;
        const endTs = `${endDate}T23:59:59`;
        const [sales, top, usage] = await Promise.all([
            apiRequest(`/api/orders/sales-summary?start=${encodeURIComponent(startTs)}&end=${encodeURIComponent(endTs)}`),
            apiRequest(`/api/orders/top-selling?start=${encodeURIComponent(startTs)}&end=${encodeURIComponent(endTs)}`),
            apiRequest(`/api/inventory/usage?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`),
        ]);
        setSalesSummary(sales);
        setTopSelling(top);
        setUsageReport(usage);
    }, [apiRequest]);

    const loadXReport = useCallback(async (reportDate) => {
        if (!isISODate(reportDate)) {
            setXReportRows([]);
            return;
        }
        const xRows = await apiRequest(`/api/orders/x-report?date=${encodeURIComponent(reportDate)}`);
        setXReportRows(xRows);
    }, [apiRequest]);

    const loadOverviewUsage = useCallback(
        async (startDate, endDate) => {
            if (!isISODate(startDate) || !isISODate(endDate) || startDate > endDate) {
                setOverviewUsageReport([]);
                return;
            }
            const usage = await apiRequest(
                `/api/inventory/usage?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
            );
            setOverviewUsageReport(usage);
        },
        [apiRequest],
    );

    const refreshAll = useCallback(async () => {
        await fetchBaseData();
    }, [fetchBaseData]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError("");
            try {
                await refreshAll();
            } catch (err) {
                setError(err.message || "Failed loading manager dashboard.");
            } finally {
                setLoading(false);
            }
        })();
    }, [refreshAll]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!isISODate(rangeStart) || !isISODate(rangeEnd)) return;
            setReportsBusy(true);
            setReportsError("");
            try {
                await loadRangeReports(rangeStart, rangeEnd);
            } catch (err) {
                if (!cancelled) {
                    setReportsError(err.message || "Failed to load range reports.");
                }
            } finally {
                if (!cancelled) setReportsBusy(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadRangeReports, rangeEnd, rangeStart]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!isISODate(xReportDate)) return;
            try {
                await loadXReport(xReportDate);
            } catch (err) {
                if (!cancelled) {
                    setReportsError(err.message || "Failed to load X-report.");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadXReport, xReportDate]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!isISODate(overviewUsageStart) || !isISODate(overviewUsageEnd)) return;
            try {
                await loadOverviewUsage(overviewUsageStart, overviewUsageEnd);
            } catch (err) {
                if (!cancelled) {
                    setReportsError(err.message || "Failed to load overview usage report.");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loadOverviewUsage, overviewUsageEnd, overviewUsageStart]);

    const featuredMenuItem = useMemo(() => {
        if (!menuItems.length) return null;
        return menuItems
            .slice()
            .sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0];
    }, [menuItems]);

    const parseIngredients = () => {
        return newMenuIngredients
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [namePart, qtyPart] = line.split(":");
                const qty = qtyPart ? Number(qtyPart.trim()) : 1;
                return {
                    name: (namePart || "").trim(),
                    quantityNeeded: Number.isFinite(qty) && qty > 0 ? qty : 1,
                };
            })
            .filter((ing) => ing.name);
    };

    const withAction = async (key, fn, successMessage) => {
        setActionBusy(key);
        try {
            await fn();
            if (successMessage) showToast(successMessage);
        } catch (err) {
            showToast(`Error: ${err.message}`);
        } finally {
            setActionBusy("");
        }
    };

    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        await withAction(
            "add-menu",
            async () => {
                await apiRequest("/api/menu", {
                    method: "POST",
                    body: JSON.stringify({
                        name: newMenuName,
                        price: Number(newMenuPrice),
                        customization: newMenuCustomizable,
                        ingredients: parseIngredients(),
                    }),
                });
                setNewMenuName("");
                setNewMenuPrice("");
                setNewMenuCustomizable(false);
                setNewMenuIngredients("");
                await fetchBaseData();
            },
            "Menu item added.",
        );
    };

    const handleUpdateMenuPrice = async (itemId) => {
        await withAction(
            `menu-price-${itemId}`,
            async () => {
                await apiRequest(`/api/menu/${itemId}/price`, {
                    method: "PUT",
                    body: JSON.stringify({
                        price: Number(menuPriceEdits[itemId]),
                    }),
                });
                await fetchBaseData();
            },
            "Price updated.",
        );
    };

    const handleDeleteMenuItem = async (itemId) => {
        await withAction(
            `menu-delete-${itemId}`,
            async () => {
                await apiRequest(`/api/menu/${itemId}`, { method: "DELETE" });
                await fetchBaseData();
            },
            "Menu item deleted.",
        );
    };

    const handleSetInventory = async (itemId) => {
        await withAction(
            `inv-set-${itemId}`,
            async () => {
                await apiRequest(`/api/inventory/${itemId}/quantity`, {
                    method: "PUT",
                    body: JSON.stringify({ quantity: Number(inventorySetEdits[itemId]) }),
                });
                await fetchBaseData();
            },
            "Inventory quantity set.",
        );
    };

    const handleAddInventory = async (itemId, overrideDelta = null) => {
        const deltaValue =
            overrideDelta === null
                ? Number(inventoryAddEdits[itemId] || 0)
                : Number(overrideDelta);
        await withAction(
            `inv-add-${itemId}`,
            async () => {
                await apiRequest(`/api/inventory/${itemId}/add`, {
                    method: "PATCH",
                    body: JSON.stringify({ delta: deltaValue }),
                });
                setInventoryAddEdits((prev) => ({ ...prev, [itemId]: "" }));
                await fetchBaseData();
            },
            "Inventory adjusted.",
        );
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        await withAction(
            "emp-add",
            async () => {
                await apiRequest("/api/employees", {
                    method: "POST",
                    body: JSON.stringify({
                        username: newEmpUsername,
                        password: newEmpPassword,
                        role: newEmpRole,
                    }),
                });
                setNewEmpUsername("");
                setNewEmpPassword("");
                setNewEmpRole("cashier");
                await fetchBaseData();
            },
            "Employee added.",
        );
    };

    const handleUpdateEmployee = async (empId) => {
        const edit = employeeEdits[empId] || {};
        await withAction(
            `emp-update-${empId}`,
            async () => {
                await apiRequest(`/api/employees/${empId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        username: edit.username,
                        role: edit.role,
                    }),
                });
                await fetchBaseData();
            },
            "Employee updated.",
        );
    };

    const handleResetPassword = async (empId) => {
        await withAction(
            `emp-pass-${empId}`,
            async () => {
                await apiRequest(`/api/employees/${empId}/password`, {
                    method: "PUT",
                    body: JSON.stringify({
                        password: passwordEdits[empId] || "",
                    }),
                });
                setPasswordEdits((prev) => ({ ...prev, [empId]: "" }));
            },
            "Password reset.",
        );
    };

    const handleDeleteEmployee = async (empId) => {
        await withAction(
            `emp-delete-${empId}`,
            async () => {
                await apiRequest(`/api/employees/${empId}`, { method: "DELETE" });
                await fetchBaseData();
            },
            "Employee deleted.",
        );
    };

    const handleRunZReport = async () => {
        await withAction(
            "z-run",
            async () => {
                await apiRequest("/api/zreport/run", {
                    method: "POST",
                    body: JSON.stringify({ runByUser: "manager-ui" }),
                });
                await refreshAll();
            },
            "Z-Report complete.",
        );
    };

    const handleClearZReport = async () => {
        await withAction(
            "clear-report",
            async () => {
                await apiRequest("/api/zreport/clear-report", {
                    method: "POST",
                });
                await refreshAll();
            },
            "Cleared Z-Report.",
        );
    };

    if (loading) {
        return (
            <div className="manager-root">
                <div className="manager-loading">
                    <div className="spinner" />
                    <span>Loading manager dashboard...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="manager-root">
                <div className="manager-loading manager-error">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="manager-root">
            <aside className="manager-sidebar">
                <div className="manager-brand">
                    <h2>Manager</h2>
                    <p>Boba Operations</p>
                </div>
                <nav className="manager-nav">
                    {SECTIONS.map((section) => (
                        <button
                            key={section.key}
                            className={`manager-nav-btn ${activeSection === section.key ? "active" : ""}`}
                            onClick={() => setActiveSection(section.key)}
                            type="button"
                        >
                            {section.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="manager-main">
                <header className="manager-toolbar">
                    <div className="toolbar-left">
                        <h1>Store Dashboard</h1>
                        <span>Manage menu, inventory, staff, and reports.</span>
                    </div>
                    <div className="toolbar-actions">
                        <button
                            className="ghost-btn"
                            type="button"
                            onClick={() =>
                                withAction(
                                    "refresh-all",
                                    async () => refreshAll(),
                                    "Data refreshed.",
                                )
                            }
                            disabled={Boolean(actionBusy)}
                        >
                            Refresh
                        </button>
                        <button className="ghost-btn" type="button" onClick={() => navigate("/")}>
                            Logout
                        </button>
                    </div>
                </header>

                <section className="manager-content">
                    {activeSection === "overview" && (
                        <div className="card metrics-card">
                            <div className="card-title-row">
                                <h3>Today's Summary</h3>
                                <span className="mini-label">
                                    Z-report: {zAlreadyRun ? "already run" : "not run"}
                                </span>
                            </div>
                            <div className="inline-actions">
                                <button
                                    className="primary-btn"
                                    type="button"
                                    disabled={zAlreadyRun || actionBusy === "z-run"}
                                    onClick={handleRunZReport}
                                >
                                    {actionBusy === "z-run" ? "Running..." : "Run Z-Report"}
                                </button>
                                <button
                                    className="primary-btn"
                                    type="button"
                                    disabled={actionBusy === "clear-report"}
                                    onClick={handleClearZReport}
                                >
                                    {actionBusy === "clear-report" ? "Clearing..." : "Refresh Z-Report"}
                                </button>
                            </div>
                            <div className="split-list">
                                <div>
                                    <h4>Sales and Tax</h4>
                                    <ul className="simple-list">
                                        <li><span>Gross Sales</span><strong>{fmtMoney(zTotals?.grossSales)}</strong></li>
                                        <li><span>Discounts</span><strong>{fmtMoney(zTotals?.discounts)}</strong></li>
                                        <li><span>Voids</span><strong>{fmtMoney(zTotals?.voids)}</strong></li>
                                        <li><span>Net Sales</span><strong>{fmtMoney(zTotals?.netSales)}</strong></li>
                                        <li><span>Tax Collected</span><strong>{fmtMoney(zTotals?.taxCollected)}</strong></li>
                                        <li><span>Total Cash</span><strong>{fmtMoney(zTotals?.totalCash)}</strong></li>
                                        <li><span>Service Charges</span><strong>{fmtMoney(zTotals?.serviceCharges)}</strong></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4>Payment Methods</h4>
                                    <ul className="simple-list">
                                        <li><span>Cash</span><strong>{fmtMoney(zTotals?.payCash)}</strong></li>
                                        <li><span>Credit</span><strong>{fmtMoney(zTotals?.payCredit)}</strong></li>
                                        <li><span>Mobile</span><strong>{fmtMoney(zTotals?.payOther)}</strong></li>
                                    </ul>
                                    <h4 className="overview-subheading">Transaction Counts</h4>
                                    <ul className="simple-list">
                                        <li><span>Total Orders</span><strong>{fmtInt(zTotals?.orderCount)}</strong></li>
                                        <li><span>Void Count</span><strong>{fmtInt(zTotals?.voidCount)}</strong></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "overview" && (
                        <div className="card">
                            <h3>Featured Menu Item</h3>
                            {!featuredMenuItem ? (
                                <p className="muted-copy">No menu items available yet.</p>
                            ) : (
                                <div className="featured-item">
                                    <p className="featured-name">{featuredMenuItem.name}</p>
                                    <p className="featured-meta">
                                        Price: <strong>{fmtMoney(featuredMenuItem.price)}</strong>
                                    </p>
                                    <p className="featured-meta">
                                        Customizable:{" "}
                                        <strong>{featuredMenuItem.customization ? "Yes" : "No"}</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === "overview" && (
                        <div className="split-list">
                            <div className="card">
                                <div className="card-title-row">
                                    <h3>Product Usage</h3>
                                    <div className="date-controls">
                                        <label>
                                            Start
                                            <input
                                                type="date"
                                                value={overviewUsageStart}
                                                onChange={(e) => setOverviewUsageStart(e.target.value)}
                                            />
                                        </label>
                                        <label>
                                            End
                                            <input
                                                type="date"
                                                value={overviewUsageEnd}
                                                onChange={(e) => setOverviewUsageEnd(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>
                                {overviewUsageStart > overviewUsageEnd && (
                                    <p className="error-copy">Start date must be before end date.</p>
                                )}
                                <div className="usage-chart">
                                    {overviewUsageReport.map((item) => {
                                        const used = Number(item.used || 0);
                                        const barWidthPx = Math.max(0, Math.round(used * 12));
                                        return (
                                            <div className="usage-row" key={item.itemName}>
                                                <div className="usage-label">{item.itemName}</div>
                                                <div className="usage-bar-wrap">
                                                    <div
                                                        className="usage-bar"
                                                        style={{ width: `${barWidthPx}px` }}
                                                    />
                                                </div>
                                                <div className="usage-value">{used}</div>
                                            </div>
                                        );
                                    })}
                                    {overviewUsageReport.length === 0 && (
                                        <p className="muted-copy">No usage data for the selected date range.</p>
                                    )}
                                </div>
                            </div>
                            <div className="card">
                                <h3>Recent Orders</h3>
                                <ul className="simple-list">
                                    {recentOrders.map((o) => (
                                        <li key={o.id}>
                                            <span>
                                                #{o.id}{" "}
                                                {o.orderDate
                                                    ? new Date(o.orderDate).toLocaleString()
                                                    : "-"}
                                            </span>
                                            <strong>{fmtMoney(o.total)}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeSection === "menu" && (
                        <div className="card">
                            <h3>Menu Management</h3>
                            <form className="inline-form stack" onSubmit={handleAddMenuItem}>
                                <input
                                    value={newMenuName}
                                    onChange={(e) => setNewMenuName(e.target.value)}
                                    placeholder="Item name"
                                    required
                                />
                                <input
                                    value={newMenuPrice}
                                    onChange={(e) => setNewMenuPrice(e.target.value)}
                                    placeholder="Price (e.g. 4.95)"
                                    type="number"
                                    step="0.01"
                                    required
                                />
                                <label className="checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={newMenuCustomizable}
                                        onChange={(e) => setNewMenuCustomizable(e.target.checked)}
                                    />
                                    Customizable
                                </label>
                                <textarea
                                    value={newMenuIngredients}
                                    onChange={(e) => setNewMenuIngredients(e.target.value)}
                                    placeholder={"Ingredients (one per line):\nMilk:1\nTapioca:2"}
                                />
                                <button
                                    className="primary-btn"
                                    type="submit"
                                    disabled={actionBusy === "add-menu"}
                                >
                                    {actionBusy === "add-menu" ? "Adding..." : "Add Item"}
                                </button>
                            </form>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Price</th>
                                            <th>Custom</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {menuItems.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.id}</td>
                                                <td>{item.name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={menuPriceEdits[item.id] ?? ""}
                                                        onChange={(e) =>
                                                            setMenuPriceEdits((prev) => ({
                                                                ...prev,
                                                                [item.id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>{item.customization ? "Yes" : "No"}</td>
                                                <td>
                                                    <div className="row-actions">
                                                        <button
                                                            className="ghost-btn"
                                                            type="button"
                                                            onClick={() => handleUpdateMenuPrice(item.id)}
                                                            disabled={actionBusy === `menu-price-${item.id}`}
                                                        >
                                                            Save Price
                                                        </button>
                                                        <button
                                                            className="danger-btn"
                                                            type="button"
                                                            onClick={() => handleDeleteMenuItem(item.id)}
                                                            disabled={actionBusy === `menu-delete-${item.id}`}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === "inventory" && (
                        <div className="card">
                            <h3>Inventory Management</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Current Qty</th>
                                            <th>Set Qty</th>
                                            <th>Add Inventory</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryItems.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.id}</td>
                                                <td>{item.name}</td>
                                                <td>{item.quantity}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={inventorySetEdits[item.id] ?? ""}
                                                        onChange={(e) =>
                                                            setInventorySetEdits((prev) => ({
                                                                ...prev,
                                                                [item.id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={inventoryAddEdits[item.id] ?? ""}
                                                        onChange={(e) =>
                                                            setInventoryAddEdits((prev) => ({
                                                                ...prev,
                                                                [item.id]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="+/-"
                                                    />
                                                    <div className="quick-add-row">
                                                        {[1, 5, 10, 25, 50].map((n) => (
                                                            <button
                                                                key={`plus-${item.id}-${n}`}
                                                                className="mini-btn"
                                                                type="button"
                                                                onClick={() => handleAddInventory(item.id, n)}
                                                                disabled={actionBusy === `inv-add-${item.id}`}
                                                            >
                                                                +{n}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="row-actions">
                                                        <button
                                                            className="ghost-btn"
                                                            type="button"
                                                            onClick={() => handleSetInventory(item.id)}
                                                            disabled={actionBusy === `inv-set-${item.id}`}
                                                        >
                                                            Set
                                                        </button>
                                                        <button
                                                            className="ghost-btn"
                                                            type="button"
                                                            onClick={() => handleAddInventory(item.id)}
                                                            disabled={actionBusy === `inv-add-${item.id}`}
                                                        >
                                                            Add Inventory
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="split-list">
                                <div>
                                    <h4>Inventory Report (low to high)</h4>
                                    <ul className="simple-list">
                                        {inventoryReport.map((item) => (
                                            <li key={item.name}>
                                                <span>{item.name}</span>
                                                <strong>{item.quantity}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4>Usage Report (date range)</h4>
                                    <ul className="simple-list">
                                        {usageReport.map((item) => (
                                            <li key={item.itemName}>
                                                <span>{item.itemName}</span>
                                                <strong>{item.used}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === "employees" && (
                        <div className="card">
                            <h3>Employee Management</h3>
                            <form className="inline-form" onSubmit={handleAddEmployee}>
                                <input
                                    value={newEmpUsername}
                                    onChange={(e) => setNewEmpUsername(e.target.value)}
                                    placeholder="Username"
                                    required
                                />
                                <input
                                    value={newEmpPassword}
                                    onChange={(e) => setNewEmpPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                />
                                <select
                                    value={newEmpRole}
                                    onChange={(e) => setNewEmpRole(e.target.value)}
                                >
                                    <option value="cashier">cashier</option>
                                    <option value="manager">manager</option>
                                </select>
                                <button
                                    className="primary-btn"
                                    type="submit"
                                    disabled={actionBusy === "emp-add"}
                                >
                                    {actionBusy === "emp-add" ? "Adding..." : "Add Employee"}
                                </button>
                            </form>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Password Reset</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => {
                                            const edit = employeeEdits[emp.employeeId] || {
                                                username: emp.username,
                                                role: emp.role,
                                            };
                                            return (
                                                <tr key={emp.employeeId}>
                                                    <td>{emp.employeeId}</td>
                                                    <td>
                                                        <input
                                                            value={edit.username ?? ""}
                                                            onChange={(e) =>
                                                                setEmployeeEdits((prev) => ({
                                                                    ...prev,
                                                                    [emp.employeeId]: {
                                                                        ...edit,
                                                                        username: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={edit.role ?? "cashier"}
                                                            onChange={(e) =>
                                                                setEmployeeEdits((prev) => ({
                                                                    ...prev,
                                                                    [emp.employeeId]: {
                                                                        ...edit,
                                                                        role: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                        >
                                                            <option value="cashier">cashier</option>
                                                            <option value="manager">manager</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="New password"
                                                            value={passwordEdits[emp.employeeId] ?? ""}
                                                            onChange={(e) =>
                                                                setPasswordEdits((prev) => ({
                                                                    ...prev,
                                                                    [emp.employeeId]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="row-actions">
                                                            <button
                                                                className="ghost-btn"
                                                                type="button"
                                                                onClick={() => handleUpdateEmployee(emp.employeeId)}
                                                                disabled={actionBusy === `emp-update-${emp.employeeId}`}
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                className="ghost-btn"
                                                                type="button"
                                                                onClick={() => handleResetPassword(emp.employeeId)}
                                                                disabled={actionBusy === `emp-pass-${emp.employeeId}`}
                                                            >
                                                                Reset Pass
                                                            </button>
                                                            <button
                                                                className="danger-btn"
                                                                type="button"
                                                                onClick={() => handleDeleteEmployee(emp.employeeId)}
                                                                disabled={actionBusy === `emp-delete-${emp.employeeId}`}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSection === "reports" && (
                        <div className="card">
                            <div className="card-title-row">
                                <h3>Reports</h3>
                                <div className="date-controls">
                                    <label>
                                        Start
                                        <input
                                            type="date"
                                            value={rangeStart}
                                            onChange={(e) => setRangeStart(e.target.value)}
                                        />
                                    </label>
                                    <label>
                                        End
                                        <input
                                            type="date"
                                            value={rangeEnd}
                                            onChange={(e) => setRangeEnd(e.target.value)}
                                        />
                                    </label>
                                </div>
                            </div>
                            {reportsBusy && <p className="muted-copy">Refreshing reports...</p>}
                            {reportsError && <p className="error-copy">{reportsError}</p>}
                            {rangeStart > rangeEnd && (
                                <p className="error-copy">Start date must be before end date.</p>
                            )}
                            <div className="report-grid">
                                <div className="report-card">
                                    <h4>Recent Orders</h4>
                                    <ul className="simple-list">
                                        {recentOrders.map((o) => (
                                            <li key={o.id}>
                                                <span>
                                                    #{o.id}{" "}
                                                    {o.orderDate
                                                        ? new Date(o.orderDate).toLocaleString()
                                                        : "-"}
                                                </span>
                                                <strong>{fmtMoney(o.total)}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="report-card">
                                    <h4>Sales Summary</h4>
                                    <ul className="simple-list">
                                        {salesSummary.map((row) => (
                                            <li key={row.date}>
                                                <span>
                                                    {row.date} ({row.count} orders)
                                                </span>
                                                <strong>{fmtMoney(row.revenue)}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="report-card">
                                    <h4>Top Selling</h4>
                                    <ul className="simple-list">
                                        {topSelling.map((row) => (
                                            <li key={row.name}>
                                                <span>{row.name}</span>
                                                <strong>{row.quantity}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="report-card">
                                    <h4>Inventory Usage</h4>
                                    <ul className="simple-list">
                                        {usageReport.map((item) => (
                                            <li key={item.itemName}>
                                                <span>{item.itemName}</span>
                                                <strong>{item.used}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="report-card report-card-wide">
                                    <h4>X-Report</h4>
                                    <div className="inline-form">
                                        <input
                                            type="date"
                                            value={xReportDate}
                                            onChange={(e) => setXReportDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="table-wrap">
                                        <table className="x-report-table">
                                            <thead>
                                                <tr>
                                                    <th>Hour</th>
                                                    <th>Sales #</th>
                                                    <th className="group-divider">Sales $</th>
                                                    <th>Cash #</th>
                                                    <th className="group-divider">Cash $</th>
                                                    <th>Card #</th>
                                                    <th className="group-divider">Card $</th>
                                                    <th>Mobile #</th>
                                                    <th className="group-divider">Mobile $</th>
                                                    <th>Returns #</th>
                                                    <th className="group-divider">Returns $</th>
                                                    <th>Voids #</th>
                                                    <th className="group-divider">Voids $</th>
                                                    <th>Discards #</th>
                                                    <th className="group-divider">Discards $</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {xReportRows.map((row, idx) => (
                                                    <tr key={`${row.hour}-${idx}`}>
                                                        <td>{row.hour}</td>
                                                        <td>{fmtInt(row.salesCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.salesAmount)}</td>
                                                        <td>{fmtInt(row.cashCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.cashAmount)}</td>
                                                        <td>{fmtInt(row.cardCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.cardAmount)}</td>
                                                        <td>{fmtInt(row.mobileCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.mobileAmount)}</td>
                                                        <td>{fmtInt(row.returnCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.returnAmount)}</td>
                                                        <td>{fmtInt(row.voidCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.voidAmount)}</td>
                                                        <td>{fmtInt(row.discardCount)}</td>
                                                        <td className="group-divider">{fmtMoney(row.discardAmount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}