import { useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import "./KioskScreenMagnifier.css";

const LENS_PX = 140;
/** Minimum ms between html2canvas runs (main cost) */
const MIN_CAPTURE_INTERVAL_MS = 200;
/** Ignore sub-pixel jitter */
const MOVE_THRESHOLD_PX = 6;
/** html2canvas scale: keep at 1 for speed; lens is small */
const SNAPSHOT_SCALE = 1;

/**
 * Circular lens overlay; captures pixels from `captureRef` (contrast-adjusted layer).
 */
export default function KioskScreenMagnifier({ captureRef, enabled, zoom }) {
    const canvasRef = useRef(null);
    const lensWrapRef = useRef(null);
    const lastCapRef = useRef(0);
    const busyRef = useRef(false);
    const lastPointerRef = useRef({ x: -9999, y: -9999 });
    const pendingRef = useRef(null);
    const rafRef = useRef(0);

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

            const dx = Math.abs(clientX - lastPointerRef.current.x);
            const dy = Math.abs(clientY - lastPointerRef.current.y);
            if (dx < MOVE_THRESHOLD_PX && dy < MOVE_THRESHOLD_PX && wrap.style.opacity === "1") {
                wrap.style.left = `${clientX}px`;
                wrap.style.top = `${clientY}px`;
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
            if (
                now - lastCapRef.current < MIN_CAPTURE_INTERVAL_MS ||
                busyRef.current
            ) {
                wrap.style.left = `${clientX}px`;
                wrap.style.top = `${clientY}px`;
                return;
            }

            lastCapRef.current = now;
            busyRef.current = true;
            lastPointerRef.current = { x: clientX, y: clientY };

            try {
                const snap = await html2canvas(el, {
                    x,
                    y,
                    width: w,
                    height: h,
                    scale: SNAPSHOT_SCALE,
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
                ctx.imageSmoothingEnabled = true;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    snap,
                    0,
                    0,
                    snap.width,
                    snap.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                );

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

    const flushPending = useCallback(() => {
        rafRef.current = 0;
        const p = pendingRef.current;
        if (!p) return;
        runCapture(p.cx, p.cy);
    }, [runCapture]);

    useEffect(() => {
        if (!enabled) {
            if (lensWrapRef.current) lensWrapRef.current.style.opacity = "0";
            lastPointerRef.current = { x: -9999, y: -9999 };
            pendingRef.current = null;
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }
            return;
        }

        const onMove = (e) => {
            const cx = e.clientX ?? e.touches?.[0]?.clientX;
            const cy = e.clientY ?? e.touches?.[0]?.clientY;
            if (cx == null || cy == null) return;
            pendingRef.current = { cx, cy };
            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(flushPending);
            }
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("touchmove", onMove, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("touchmove", onMove);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            pendingRef.current = null;
        };
    }, [enabled, flushPending]);

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
