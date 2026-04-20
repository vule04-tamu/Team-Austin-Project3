import { useEffect } from "react";
import "./KioskAccessibility.css";

/**
 * Edge control: outer shell clips width (tab-only vs full panel); inner flex keeps tab on the right.
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
                    data-html2canvas-ignore
                />
            )}

            <div
                className={`kiosk-a11y-dock-shell ${open ? "is-open" : ""}`}
                data-html2canvas-ignore
            >
                <div className="kiosk-a11y-dock">
                    <button
                        type="button"
                        className={`kiosk-a11y-edge-tab ${open ? "is-open" : ""}`}
                        onClick={() => onOpenChange(!open)}
                        aria-expanded={open}
                        aria-controls="kiosk-a11y-drawer"
                        title="Accessibility options"
                    >
                        <span className="kiosk-a11y-edge-tab-icon" aria-hidden>
                            ◐
                        </span>
                        <span className="kiosk-a11y-edge-tab-label">Accessibility</span>
                    </button>

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
                </div>
            </div>
        </>
    );
}
