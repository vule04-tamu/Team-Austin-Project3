import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { useLanguage } from "./LanguageSwitch";
import "./TextSizeControl.css";

const TEXT_SIZE_SCALES = {
    small: 0.85,
    normal: 1,
    large: 1.15,
    xlarge: 1.3,
};
const TEXT_SIZE_STORAGE_KEY = "textSizeScale";
const TEXT_SCALE_IGNORE_ATTR = "data-text-scale-ignore";

const TextSizeContext = createContext(null);

const shouldIgnoreElement = (el) =>
    Boolean(el.closest(`[${TEXT_SCALE_IGNORE_ATTR}="true"]`));

const primeOriginalFontSize = (el, currentScale) => {
    if (el.hasAttribute("data-original-font-size") || shouldIgnoreElement(el)) {
        return;
    }

    const computedStyle = window.getComputedStyle(el);
    const currentFontSize = parseFloat(computedStyle.fontSize);
    if (Number.isNaN(currentFontSize)) {
        return;
    }

    const normalizedScale =
        typeof currentScale === "number" && currentScale > 0 ? currentScale : 1;
    const baseSizeValue = currentFontSize / normalizedScale;
    el.setAttribute("data-original-font-size", `${baseSizeValue}`);
};

const scaleElement = (el, scale) => {
    if (shouldIgnoreElement(el)) {
        return;
    }

    if (scale === 1) {
        el.style.removeProperty("font-size");
        el.removeAttribute("data-original-font-size");
        return;
    }

    const originalSize = el.getAttribute("data-original-font-size");
    const baseSizeValue = parseFloat(originalSize);

    if (!isNaN(baseSizeValue)) {
        el.style.fontSize = `${baseSizeValue * scale}px`;
    }
};

const getElementBatch = (root) => [root, ...root.querySelectorAll("*")];

const scaleAllElements = (scale, currentScale) => {
    const body = document.body;
    if (!body) {
        return;
    }

    const elements = getElementBatch(body);
    if (scale !== 1) {
        elements.forEach((el) => {
            primeOriginalFontSize(el, currentScale);
        });
    }
    elements.forEach((el) => {
        scaleElement(el, scale);
    });
};

export function TextSizeProvider({ children }) {
    const [scale, setScaleKey] = useState("normal");
    const appliedScaleRef = useRef(TEXT_SIZE_SCALES.normal);

    useEffect(() => {
        const raw = localStorage.getItem(TEXT_SIZE_STORAGE_KEY) || "normal";
        const saved =
            TEXT_SIZE_SCALES[raw] != null ? raw : "normal";
        setScaleKey(saved);
        const scaleValue = TEXT_SIZE_SCALES[saved];
        document.documentElement.style.setProperty("--font-scale", scaleValue);
        scaleAllElements(scaleValue, appliedScaleRef.current);
        appliedScaleRef.current = scaleValue;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            const elements = getElementBatch(node);
                            if (appliedScaleRef.current !== 1) {
                                elements.forEach((el) => {
                                    primeOriginalFontSize(
                                        el,
                                        appliedScaleRef.current,
                                    );
                                });
                            }
                            elements.forEach((el) => {
                                scaleElement(el, appliedScaleRef.current);
                            });
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => observer.disconnect();
    }, []);

    const applyScale = useCallback((scaleKey) => {
        const scaleValue = TEXT_SIZE_SCALES[scaleKey];
        const previousScale = appliedScaleRef.current;
        document.documentElement.style.setProperty("--font-scale", scaleValue);
        scaleAllElements(scaleValue, previousScale);
        appliedScaleRef.current = scaleValue;
        localStorage.setItem(TEXT_SIZE_STORAGE_KEY, scaleKey);
    }, []);

    const setScale = useCallback(
        (scaleKey) => {
            setScaleKey(scaleKey);
            applyScale(scaleKey);
        },
        [applyScale],
    );

    const value = useMemo(() => ({ scale, setScale }), [scale, setScale]);

    return (
        <TextSizeContext.Provider value={value}>
            {children}
        </TextSizeContext.Provider>
    );
}

export function useTextSize() {
    const ctx = useContext(TextSizeContext);
    if (!ctx) {
        throw new Error("useTextSize must be used within TextSizeProvider");
    }
    return ctx;
}

/** Reusable button row; used in global header and kiosk accessibility drawer */
export function TextSizeButtonRow({ className = "", buttonClassName = "size-btn" }) {
    const { scale, setScale } = useTextSize();
    const { t } = useLanguage();

    return (
        <div className={`text-size-buttons ${className}`.trim()}>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "small" ? "active" : ""}`}
                onClick={() => setScale("small")}
                title={t("smaller_text")}
                aria-label={t("smaller_text")}
            >
                <span className="size-indicator small">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "normal" ? "active" : ""}`}
                onClick={() => setScale("normal")}
                title={t("normal_text")}
                aria-label={t("normal_text")}
            >
                <span className="size-indicator normal">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "large" ? "active" : ""}`}
                onClick={() => setScale("large")}
                title={t("larger_text")}
                aria-label={t("larger_text")}
            >
                <span className="size-indicator large">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "xlarge" ? "active" : ""}`}
                onClick={() => setScale("xlarge")}
                title={t("extra_large_text")}
                aria-label={t("extra_large_text")}
            >
                <span className="size-indicator xlarge">A</span>
            </button>
        </div>
    );
}

export default function TextSizeControl() {
    return (
        <div className="text-size-control">
            <TextSizeButtonRow />
        </div>
    );
}
