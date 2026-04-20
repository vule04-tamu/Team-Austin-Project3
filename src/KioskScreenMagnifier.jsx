import { useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import "./KioskScreenMagnifier.css";

const LENS_PX = 140;
const CAPTURE_INTERVAL_MS = 95;

/**
 * Circular lens overlay; captures pixels from `captureRef` (contrast-adjusted layer).
 */
export default function KioskScreenMagnifier({ captureRef, enabled, zoom }) {
    const canvasRef = useRef(null);
    const lensWrapRef = useRef(null);
    const lastCapRef = useRef(0);
    const busyRef = useRef(false);

    const runCapture = useCallback(
        async (clientX, clientY) => {
            const el = captureRef?.current;
            const canvas = canvasRef.current;
            const wrap = lensWrapRef.current;
            if (!el || !canvas || !wrap) return;

            const rect = el.getBoundingClientRect();
            const inside =
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY <= rect.bottom;
            if (!inside) {
                wrap.style.opacity = "0";
                return;
            }

            const srcW = LENS_PX / zoom;
            const cx = clientX - rect.left + el.scrollLeft;
            const cy = clientY - rect.top + el.scrollTop;
            let x = cx - srcW / 2;
            let y = cy - srcW / 2;
            x = Math.max(0, Math.min(x, el.scrollWidth - srcW));
            y = Math.max(0, Math.min(y, el.scrollHeight - srcW));
            const w = Math.min(srcW, el.scrollWidth - x);
            const h = Math.min(srcW, el.scrollHeight - y);
            if (w < 4 || h < 4) return;

            const now = performance.now();
            if (now - lastCapRef.current < CAPTURE_INTERVAL_MS || busyRef.current) {
                return;
            }
            lastCapRef.current = now;
            busyRef.current = true;

            try {
                const snap = await html2canvas(el, {
                    x,
                    y,
                    width: w,
                    height: h,
                    scale: Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2),
                    logging: false,
                    useCORS: true,
                    backgroundColor: null,
                });
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = LENS_PX * dpr;
                canvas.height = LENS_PX * dpr;
                canvas.style.width = `${LENS_PX}px`;
                canvas.style.height = `${LENS_PX}px`;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(snap, 0, 0, snap.width, snap.height, 0, 0, canvas.width, canvas.height);

                wrap.style.left = `${clientX}px`;
                wrap.style.top = `${clientY}px`;
                wrap.style.opacity = "1";
            } catch {
                // snapshot can fail for tainted canvas / edge cases
            } finally {
                busyRef.current = false;
            }
        },
        [captureRef, zoom],
    );

    useEffect(() => {
        if (!enabled) {
            if (lensWrapRef.current) lensWrapRef.current.style.opacity = "0";
            return;
        }

        const onMove = (e) => {
            const cx = e.clientX ?? e.touches?.[0]?.clientX;
            const cy = e.clientY ?? e.touches?.[0]?.clientY;
            if (cx == null || cy == null) return;
            runCapture(cx, cy);
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("touchmove", onMove, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("touchmove", onMove);
        };
    }, [enabled, runCapture]);

    if (!enabled) return null;

    return (
        <div
            className="kiosk-magnifier-lens-wrap"
            ref={lensWrapRef}
            data-html2canvas-ignore
            aria-hidden
        >
            <canvas ref={canvasRef} className="kiosk-magnifier-canvas" />
        </div>
    );
}
