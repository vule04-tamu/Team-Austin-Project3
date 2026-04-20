import KioskContrastSlider from "./KioskContrastSlider.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { TextSizeButtonRow } from "./TextSizeControl.jsx";
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
 * Contents of the accessibility drawer (contrast, text size, language, magnifier).
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
            <section
                className="kiosk-a11y-section"
                aria-labelledby="kiosk-a11y-text-heading"
            >
                <h2 id="kiosk-a11y-text-heading" className="kiosk-a11y-section-label">
                    Text size
                </h2>
                <TextSizeButtonRow
                    className="kiosk-text-size-buttons"
                    buttonClassName="size-btn kiosk-size-btn"
                />
            </section>

            <section
                className="kiosk-a11y-section"
                aria-labelledby="kiosk-a11y-lang-heading"
            >
                <h2 id="kiosk-a11y-lang-heading" className="kiosk-a11y-section-label">
                    Language
                </h2>
                <LanguageSwitcher layout="embedded" />
            </section>

            <section className="kiosk-a11y-section" aria-label="Contrast">
                <KioskContrastSlider
                    value={contrastPct}
                    onChange={onContrastChange}
                    id="kiosk-contrast"
                />
            </section>

            <section
                className="kiosk-a11y-section"
                aria-labelledby="kiosk-a11y-mag-heading"
            >
                <h2 id="kiosk-a11y-mag-heading" className="kiosk-a11y-section-label">
                    Magnifier
                </h2>
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
                    <div
                        className="kiosk-a11y-zooms"
                        role="toolbar"
                        aria-label="Magnification level"
                    >
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
            </section>
        </div>
    );
}
