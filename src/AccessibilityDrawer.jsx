import { useState } from "react";
import KioskAccessibilityPanel from "./KioskAccessibilityPanel.jsx";
import KioskAccessibilityToolbar from "./KioskAccessibilityToolbar.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useLanguage } from "./LanguageSwitch";
import { TextSizeButtonRow } from "./TextSizeControl.jsx";

export default function AccessibilityDrawer({
    contrastPct,
    onContrastChange,
}) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);

    return (
        <KioskAccessibilityPanel open={open} onOpenChange={setOpen}>
            <KioskAccessibilityToolbar
                contrastPct={contrastPct}
                onContrastChange={onContrastChange}
            />
            <LanguageSwitcher layout="embedded" />
            <div className="kiosk-a11y-text-size">
                <span className="kiosk-a11y-section-label">{t("text_size")}</span>
                <TextSizeButtonRow
                    className="kiosk-a11y-text-size-row"
                    buttonClassName="kiosk-a11y-size-btn"
                />
            </div>
        </KioskAccessibilityPanel>
    );
}
