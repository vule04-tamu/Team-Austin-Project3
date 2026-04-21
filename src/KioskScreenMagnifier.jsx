import { useEffect, useState } from "react";
import "./KioskScreenMagnifier.css";

/**
 * Global circular screen magnifier.
 * Keeps the base UI unchanged and shows magnified content only inside the lens.
 */
export default function KioskScreenMagnifier({
    captureRef,
    enabled,
    zoom,
    lensSize = 170,
}) {
    const [pointer, setPointer] = useState(() => ({
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
        y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
        active: false,
    }));
    const [snapshot, setSnapshot] = useState(null);

    useEffect(() => {
        const el = captureRef?.current;
        if (!enabled || !el) {
            setPointer((prev) => ({ ...prev, active: false }));
            setSnapshot(null);
            return;
        }

        let rafId = 0;
        let syncQueued = false;

        const syncSnapshot = () => {
            syncQueued = false;
            if (!el.isConnected) return;

            const clone = el.cloneNode(true);
            const rect = el.getBoundingClientRect();

            setSnapshot({
                html: clone.outerHTML,
                rect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
            });
        };

        const queueSync = () => {
            if (syncQueued) return;
            syncQueued = true;
            rafId = requestAnimationFrame(syncSnapshot);
        };

        const onMove = (e) => {
            const x = e.clientX ?? e.touches?.[0]?.clientX;
            const y = e.clientY ?? e.touches?.[0]?.clientY;
            if (x == null || y == null) return;
            setPointer({ x, y, active: true });
        };

        const onLeave = () => {
            setPointer((prev) => ({ ...prev, active: false }));
        };

        const observer = new MutationObserver(queueSync);
        observer.observe(el, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
        });

        syncSnapshot();
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("pointerleave", onLeave, { passive: true });
        window.addEventListener("blur", onLeave);
        window.addEventListener("resize", queueSync, { passive: true });
        window.addEventListener("scroll", queueSync, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("blur", onLeave);
            window.removeEventListener("resize", queueSync);
            window.removeEventListener("scroll", queueSync);
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [captureRef, enabled]);

    if (!enabled || !snapshot || !pointer.active) return null;

    const lensHalf = lensSize / 2;
    const lensLeft = pointer.x - lensHalf;
    const lensTop = pointer.y - lensHalf;
    const offset = lensHalf * (1 - zoom);

    return (
        <div
            className="kiosk-screen-magnifier"
            style={{
                width: lensSize,
                height: lensSize,
                left: lensLeft,
                top: lensTop,
            }}
            aria-hidden
        >
            <div
                className="kiosk-screen-magnifier-scene"
                style={{
                    width: snapshot.viewport.width,
                    height: snapshot.viewport.height,
                    left: -lensLeft,
                    top: -lensTop,
                }}
            >
                <div
                    className="kiosk-screen-magnifier-content"
                    style={{
                        transform: `translate(${offset}px, ${offset}px) scale(${zoom})`,
                    }}
                >
                    <div
                        className="kiosk-screen-magnifier-capture"
                        style={{
                            left: snapshot.rect.left,
                            top: snapshot.rect.top,
                            width: snapshot.rect.width,
                            minHeight: snapshot.rect.height,
                        }}
                    >
                        <div
                            className="kiosk-screen-magnifier-snapshot"
                            // Snapshot is generated from the existing app DOM and displayed as a read-only overlay.
                            dangerouslySetInnerHTML={{ __html: snapshot.html }}
                        />
                    </div>
                </div>
            </div>
            <div className="kiosk-screen-magnifier-crosshair">
                <span className="kiosk-screen-magnifier-crosshair-x" />
                <span className="kiosk-screen-magnifier-crosshair-y" />
            </div>
            <div className="kiosk-screen-magnifier-label">{zoom}x</div>
        </div>
    );
}
