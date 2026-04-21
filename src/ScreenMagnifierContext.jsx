import { createContext, useContext, useMemo, useState, useEffect } from "react";

const MAGNIFIER_LS_KEY = "screenMagnifierPrefs";
const ZOOM_LEVELS = [0.5, 1, 1.5, 2, 2.5, 3];

const ScreenMagnifierContext = createContext(null);

function nearestZoom(z) {
    const n = Number(z);
    if (!Number.isFinite(n)) return 1;
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

function readPrefs() {
    try {
        const raw = localStorage.getItem(MAGNIFIER_LS_KEY);
        if (!raw) return { enabled: false, zoom: 1 };
        const parsed = JSON.parse(raw);
        return {
            enabled: Boolean(parsed.enabled),
            zoom: nearestZoom(parsed.zoom ?? 1),
        };
    } catch {
        return { enabled: false, zoom: 1 };
    }
}

export function ScreenMagnifierProvider({ children }) {
    const initial = useMemo(() => readPrefs(), []);
    const [magnifierEnabled, setMagnifierEnabled] = useState(initial.enabled);
    const [magnifierZoom, setMagnifierZoom] = useState(initial.zoom);

    useEffect(() => {
        try {
            localStorage.setItem(
                MAGNIFIER_LS_KEY,
                JSON.stringify({
                    enabled: magnifierEnabled,
                    zoom: nearestZoom(magnifierZoom),
                }),
            );
        } catch {
            /* ignore storage failures */
        }
    }, [magnifierEnabled, magnifierZoom]);

    const value = useMemo(
        () => ({
            magnifierEnabled,
            setMagnifierEnabled,
            magnifierZoom: nearestZoom(magnifierZoom),
            setMagnifierZoom: (z) => setMagnifierZoom(nearestZoom(z)),
            magnifierZoomLevels: ZOOM_LEVELS,
        }),
        [magnifierEnabled, magnifierZoom],
    );

    return (
        <ScreenMagnifierContext.Provider value={value}>
            {children}
        </ScreenMagnifierContext.Provider>
    );
}

export function useScreenMagnifier() {
    const ctx = useContext(ScreenMagnifierContext);
    if (!ctx) {
        throw new Error("useScreenMagnifier must be used within ScreenMagnifierProvider");
    }
    return ctx;
}

