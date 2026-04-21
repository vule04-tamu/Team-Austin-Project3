import { useEffect } from "react";
import "./KioskAccessibility.css";

/**
 * Right-edge drawer: drawer surface + narrow handle share one rail (normal drawer chrome).
 */
export default function KioskAccessibilityPanel({ open, onOpenChange, children }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onOpenChange(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onOpenChange]);

    return (
        <>
            {open && (
                <div
                    className="kiosk-a11y-backdrop"
                    role="presentation"
                    aria-hidden
                    onClick={() => onOpenChange(false)}
                />
            )}

            <div
                className={`kiosk-a11y-dock-shell ${open ? "is-open" : ""}`}
            >
                <div className="kiosk-a11y-dock">
                    <div className="kiosk-a11y-rail">
                        <aside
                            id="kiosk-a11y-drawer"
                            className={`kiosk-a11y-drawer ${open ? "is-open" : ""}`}
                            aria-hidden={!open}
                        >
                            <div className="kiosk-a11y-drawer-header">
                                <span className="kiosk-a11y-drawer-title">Accessibility</span>
                                <button
                                    type="button"
                                    className="kiosk-a11y-drawer-close"
                                    onClick={() => onOpenChange(false)}
                                    aria-label="Close accessibility panel"
                                >
                                    ×
                                </button>
                            </div>
                            {open ? (
                                <div className="kiosk-a11y-drawer-body">{children}</div>
                            ) : null}
                        </aside>

                        <button
                            type="button"
                            className={`kiosk-a11y-edge-tab ${open ? "is-open" : ""}`}
                            onClick={() => onOpenChange(!open)}
                            aria-expanded={open}
                            aria-controls="kiosk-a11y-drawer"
                            aria-label={
                                open
                                    ? "Close accessibility options"
                                    : "Open accessibility options"
                            }
                            title="Accessibility"
                        >
                            <span className="kiosk-a11y-edge-tab-icon" aria-hidden>
                                {open ? "‹" : "›"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
