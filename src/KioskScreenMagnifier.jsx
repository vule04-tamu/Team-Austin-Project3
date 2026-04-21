import { useEffect, useRef } from "react";
import "./KioskScreenMagnifier.css";

/**
 * Pointer-follow zoom on the captured subtree using compositor transforms (no DOM rasterization).
 * Contrast/filter should live on a parent of `captureRef` so React style updates do not clobber transform.
 */
export default function KioskScreenMagnifier({ captureRef, enabled, zoom }) {
    const pendingRef = useRef(null);
    const rafRef = useRef(0);

    useEffect(() => {
        const el = captureRef?.current;
        if (!enabled || !el) {
            return;
        }

        const apply = () => {
            const p = pendingRef.current;
            if (!p || !el.isConnected) return;
            const rect = el.getBoundingClientRect();
            const ox = Math.min(Math.max(p.cx - rect.left, 0), rect.width);
            const oy = Math.min(Math.max(p.cy - rect.top, 0), rect.height);
            el.style.transformOrigin = `${ox}px ${oy}px`;
            el.style.transform = `scale(${zoom})`;
            el.style.willChange = "transform";
            el.classList.add("kiosk-mag-inner--active");
        };

        const flush = () => {
            rafRef.current = 0;
            apply();
        };

        const queue = (cx, cy) => {
            pendingRef.current = { cx, cy };
            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(flush);
            }
        };

        const onMove = (e) => {
            const cx = e.clientX ?? e.touches?.[0]?.clientX;
            const cy = e.clientY ?? e.touches?.[0]?.clientY;
            if (cx == null || cy == null) return;
            queue(cx, cy);
        };

        const rect0 = el.getBoundingClientRect();
        queue(rect0.left + rect0.width / 2, rect0.top + rect0.height / 2);
        flush();

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("touchmove", onMove, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("touchmove", onMove);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }
            pendingRef.current = null;
            el.style.removeProperty("transform");
            el.style.removeProperty("transform-origin");
            el.style.removeProperty("will-change");
            el.classList.remove("kiosk-mag-inner--active");
        };
    }, [captureRef, enabled, zoom]);

    return null;
}
