import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";
import "./TextSizeControl.css";

const TEXT_SIZE_SCALES = {
    small: 0.85,
    normal: 1,
    large: 1.15,
    xlarge: 1.3,
};

const TextSizeContext = createContext(null);

const scaleElement = (el, scale) => {
    const computedStyle = window.getComputedStyle(el);
    const currentFontSize = computedStyle.fontSize;

    if (!el.hasAttribute("data-original-font-size")) {
        el.setAttribute("data-original-font-size", currentFontSize);
    }

    const originalSize = el.getAttribute("data-original-font-size");
    const baseSizeValue = parseFloat(originalSize);

    if (!isNaN(baseSizeValue)) {
        el.style.fontSize = `${baseSizeValue * scale}px`;
    }
};

const scaleAllElements = (scale) => {
    document.querySelectorAll("*").forEach((el) => {
        scaleElement(el, scale);
    });
};

export function TextSizeProvider({ children }) {
    const [scale, setScaleKey] = useState("normal");

    useEffect(() => {
        const raw = localStorage.getItem("textSizeScale") || "normal";
        const saved =
            TEXT_SIZE_SCALES[raw] != null ? raw : "normal";
        setScaleKey(saved);
        const scaleValue = TEXT_SIZE_SCALES[saved];
        document.documentElement.style.setProperty("--font-scale", scaleValue);
        scaleAllElements(scaleValue);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    const currentScaleValue =
                        TEXT_SIZE_SCALES[
                            localStorage.getItem("textSizeScale") || "normal"
                        ];
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            scaleElement(node, currentScaleValue);
                            node.querySelectorAll("*").forEach((child) => {
                                scaleElement(child, currentScaleValue);
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
        document.documentElement.style.setProperty("--font-scale", scaleValue);
        scaleAllElements(scaleValue);
        localStorage.setItem("textSizeScale", scaleKey);
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

    return (
        <div className={`text-size-buttons ${className}`.trim()}>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "small" ? "active" : ""}`}
                onClick={() => setScale("small")}
                title="Smaller text"
            >
                <span className="size-indicator small">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "normal" ? "active" : ""}`}
                onClick={() => setScale("normal")}
                title="Normal text"
            >
                <span className="size-indicator normal">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "large" ? "active" : ""}`}
                onClick={() => setScale("large")}
                title="Larger text"
            >
                <span className="size-indicator large">A</span>
            </button>
            <button
                type="button"
                className={`${buttonClassName} ${scale === "xlarge" ? "active" : ""}`}
                onClick={() => setScale("xlarge")}
                title="Extra large text"
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
