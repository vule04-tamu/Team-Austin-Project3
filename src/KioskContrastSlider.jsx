import { useLanguage } from "./LanguageSwitch";

/**
 * Customer kiosk only: adjusts CSS contrast() for low-vision users.
 * Used together with the screen magnifier; toolbar sits outside the filtered layer.
 */
export default function KioskContrastSlider({ value, onChange, id = "kiosk-contrast-range" }) {
    const { t } = useLanguage();

    return (
        <div className="kiosk-a11y-contrast">
            <label className="kiosk-a11y-label" htmlFor={id}>
                {t("contrast")}
            </label>
            <input
                id={id}
                className="kiosk-a11y-range"
                type="range"
                min={50}
                max={200}
                step={5}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="kiosk-a11y-value" aria-live="polite">
                {value}%
            </span>
        </div>
    );
}
