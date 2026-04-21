import KioskContrastSlider from "./KioskContrastSlider.jsx";
import "./KioskAccessibility.css";

const MAGNIFIER_LS_KEY = "customerKioskMagnifierPrefs";

/** Discrete zoom steps (must match previous lens semantics: factor ≥ 1). */
const ZOOM_LEVELS = [1.25, 1.5, 2, 2.5, 3];

function nearestZoom(z) {
    const n = Number(z);
    if (!Number.isFinite(n)) return 1.5;
    let best = ZOOM_LEVELS[0];
    let bestD = Math.abs(n - best);
    for (const v of ZOOM_LEVELS) {
        const d = Math.abs(n - v);
        if (d < bestD) {
            best = v;
            bestD = d;
        }
    }
    return best;
}

export function loadMagnifierPrefs() {
    try {
        const raw = localStorage.getItem(MAGNIFIER_LS_KEY);
        if (!raw) return { zoom: 1.5, enabled: false };
        const o = JSON.parse(raw);
        return {
            zoom: nearestZoom(o.zoom ?? 1.5),
            enabled: Boolean(o.enabled),
        };
    } catch {
        return { zoom: 1.5, enabled: false };
    }
}

export function persistMagnifierPrefs(enabled, zoom) {
    try {
        localStorage.setItem(
            MAGNIFIER_LS_KEY,
            JSON.stringify({ enabled, zoom: nearestZoom(zoom) }),
        );
    } catch {
        /* ignore quota / private mode */
    }
}

export default function KioskAccessibilityToolbar({
    contrastPct,
    onContrastChange,
    magnifierEnabled,
    onMagnifierEnabledChange,
    magnifierZoom,
    onMagnifierZoomChange,
}) {
    return (
        <div className="kiosk-a11y-section">
            <KioskContrastSlider value={contrastPct} onChange={onContrastChange} />

            <div className="kiosk-a11y-mag">
                <span className="kiosk-a11y-label" id="kiosk-a11y-mag-label">
                    Magnifier
                </span>
                <button
                    type="button"
                    className={`kiosk-a11y-toggle ${magnifierEnabled ? "on" : ""}`}
                    onClick={() => onMagnifierEnabledChange(!magnifierEnabled)}
                    aria-pressed={magnifierEnabled}
                    aria-describedby="kiosk-a11y-mag-label"
                >
                    {magnifierEnabled ? "On" : "Off"}
                </button>
                <div className="kiosk-a11y-zooms" role="group" aria-label="Magnifier zoom">
                    {ZOOM_LEVELS.map((z) => (
                        <button
                            key={z}
                            type="button"
                            className={`kiosk-a11y-zoom-btn ${magnifierZoom === z ? "active" : ""}`}
                            onClick={() => onMagnifierZoomChange(z)}
                            disabled={!magnifierEnabled}
                        >
                            {z}×
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
