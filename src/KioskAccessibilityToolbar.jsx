import KioskContrastSlider from "./KioskContrastSlider.jsx";
import "./KioskAccessibility.css";
import { useLanguage } from "./LanguageSwitch.jsx";
import { useScreenMagnifier } from "./ScreenMagnifierContext.jsx";

export default function KioskAccessibilityToolbar({
    contrastPct,
    onContrastChange,
}) {
    const { t } = useLanguage();
    const {
        magnifierEnabled,
        setMagnifierEnabled,
        magnifierZoom,
        setMagnifierZoom,
        magnifierZoomLevels,
    } = useScreenMagnifier();

    return (
        <div className="kiosk-a11y-section">
            <KioskContrastSlider value={contrastPct} onChange={onContrastChange} />

            <div className="kiosk-a11y-mag">
                <span className="kiosk-a11y-label" id="kiosk-a11y-mag-label">
                    {t("magnifier")}
                </span>
                <button
                    type="button"
                    className={`kiosk-a11y-toggle ${magnifierEnabled ? "on" : ""}`}
                    onClick={() => setMagnifierEnabled(!magnifierEnabled)}
                    aria-pressed={magnifierEnabled}
                    aria-describedby="kiosk-a11y-mag-label"
                >
                    {magnifierEnabled ? t("on") : t("off")}
                </button>
                <div className="kiosk-a11y-zooms" role="group" aria-label={t("magnifier_zoom")}>
                    {magnifierZoomLevels.map((z) => (
                        <button
                            key={z}
                            type="button"
                            className={`kiosk-a11y-zoom-btn ${magnifierZoom === z ? "active" : ""}`}
                            onClick={() => setMagnifierZoom(z)}
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
