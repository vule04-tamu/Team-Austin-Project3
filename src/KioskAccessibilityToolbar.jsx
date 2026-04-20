import KioskContrastSlider from "./KioskContrastSlider.jsx";
import "./KioskAccessibility.css";

const LS_MAG = "customerKioskMagnifierEnabled";
const LS_ZOOM = "customerKioskMagnifierZoom";

export const MAGNIFIER_ZOOM_LEVELS = [0.5, 1, 1.5, 2, 2.5];

export function loadMagnifierPrefs() {
    const enabled = localStorage.getItem(LS_MAG) === "true";
    const z = parseFloat(localStorage.getItem(LS_ZOOM) || "1");
    const zoom = MAGNIFIER_ZOOM_LEVELS.includes(z) ? z : 1;
    return { enabled, zoom };
}

export function persistMagnifierPrefs(enabled, zoom) {
    localStorage.setItem(LS_MAG, String(enabled));
    localStorage.setItem(LS_ZOOM, String(zoom));
}

/**
 * Shared toolbar for Customer View: contrast slider + magnifier on/off and zoom presets.
 * Renders with data-html2canvas-ignore so the lens snapshot does not include these controls.
 */
export default function KioskAccessibilityToolbar({
    contrastPct,
    onContrastChange,
    magnifierEnabled,
    onMagnifierEnabledChange,
    magnifierZoom,
    onMagnifierZoomChange,
}) {
    return (
        <div className="kiosk-accessibility-bar" data-html2canvas-ignore>
            <KioskContrastSlider value={contrastPct} onChange={onContrastChange} id="kiosk-contrast" />
            <div className="kiosk-a11y-mag" role="group" aria-label="Screen magnifier">
                <button
                    type="button"
                    className={`kiosk-a11y-toggle ${magnifierEnabled ? "on" : ""}`}
                    onClick={() => onMagnifierEnabledChange(!magnifierEnabled)}
                    aria-pressed={magnifierEnabled}
                    title="Toggle screen magnifier"
                >
                    {magnifierEnabled ? "Magnifier on" : "Magnifier off"}
                </button>
                <div className="kiosk-a11y-zooms" role="toolbar" aria-label="Magnification level">
                    {MAGNIFIER_ZOOM_LEVELS.map((z) => (
                        <button
                            key={z}
                            type="button"
                            className={`kiosk-a11y-zoom-btn ${magnifierZoom === z ? "active" : ""}`}
                            onClick={() => onMagnifierZoomChange(z)}
                            disabled={!magnifierEnabled}
                            title={`${z}x`}
                        >
                            {z}×
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
