import { useEffect, useRef, useState } from "react";
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
    const [snapshot, setSnapshot] = useState(null);
    const lensRef = useRef(null);
    const sceneRef = useRef(null);
    const contentRef = useRef(null);
    const pointerRef = useRef({
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
        y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
        active: false,
    });
    const moveRafRef = useRef(0);

    useEffect(() => {
        const lens = lensRef.current;
        const scene = sceneRef.current;
        const content = contentRef.current;
        if (!lens || !scene || !content || !snapshot) return;

        const { x, y, active } = pointerRef.current;
        if (!active) {
            lens.style.opacity = "0";
            lens.style.visibility = "hidden";
            return;
        }

        const lensHalf = lensSize / 2;
        const lensLeft = x - lensHalf;
        const lensTop = y - lensHalf;
        const tx = x * (1 - zoom);
        const ty = y * (1 - zoom);

        lens.style.opacity = "1";
        lens.style.visibility = "visible";
        lens.style.transform = `translate3d(${lensLeft}px, ${lensTop}px, 0)`;
        scene.style.transform = `translate3d(${-lensLeft}px, ${-lensTop}px, 0)`;
        content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`;
    }, [snapshot, zoom, lensSize]);

    useEffect(() => {
        const el = captureRef?.current;
        if (!enabled || !el) {
            pointerRef.current.active = false;
            setSnapshot(null);
            return;
        }

        let syncQueued = false;
        let frameSyncId = 0;

        const syncSnapshot = () => {
            syncQueued = false;
            frameSyncId = 0;
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

        const queueMutationSync = () => {
            if (syncQueued) return;
            syncQueued = true;
            if (typeof queueMicrotask === "function") {
                queueMicrotask(syncSnapshot);
            } else {
                Promise.resolve().then(syncSnapshot);
            }
        };

        const queueFrameSync = () => {
            if (frameSyncId) return;
            frameSyncId = requestAnimationFrame(syncSnapshot);
        };

        const queueMovePaint = () => {
            if (moveRafRef.current) return;
            moveRafRef.current = requestAnimationFrame(() => {
                moveRafRef.current = 0;
                const lens = lensRef.current;
                const scene = sceneRef.current;
                const content = contentRef.current;
                if (!lens || !scene || !content) return;

                const { x, y, active } = pointerRef.current;
                if (!active) {
                    lens.style.opacity = "0";
                    lens.style.visibility = "hidden";
                    return;
                }

                const lensHalf = lensSize / 2;
                const lensLeft = x - lensHalf;
                const lensTop = y - lensHalf;
                const tx = x * (1 - zoom);
                const ty = y * (1 - zoom);

                lens.style.opacity = "1";
                lens.style.visibility = "visible";
                lens.style.transform = `translate3d(${lensLeft}px, ${lensTop}px, 0)`;
                scene.style.transform = `translate3d(${-lensLeft}px, ${-lensTop}px, 0)`;
                content.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`;
            });
        };

        const onMove = (e) => {
            const x = e.clientX ?? e.touches?.[0]?.clientX;
            const y = e.clientY ?? e.touches?.[0]?.clientY;
            if (x == null || y == null) return;

            const target = e.target;
            if (
                target instanceof Element &&
                target.closest("[data-screen-magnifier-ignore='true']")
            ) {
                pointerRef.current.active = false;
                queueMovePaint();
                return;
            }

            pointerRef.current = { x, y, active: true };
            queueMovePaint();
        };

        const onLeave = () => {
            pointerRef.current.active = false;
            queueMovePaint();
        };

        const observer = new MutationObserver(queueMutationSync);
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
        window.addEventListener("resize", queueFrameSync, { passive: true });
        window.addEventListener("scroll", queueFrameSync, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("blur", onLeave);
            window.removeEventListener("resize", queueFrameSync);
            window.removeEventListener("scroll", queueFrameSync);
            if (moveRafRef.current) {
                cancelAnimationFrame(moveRafRef.current);
                moveRafRef.current = 0;
            }
            if (frameSyncId) {
                cancelAnimationFrame(frameSyncId);
            }
        };
    }, [captureRef, enabled, zoom, lensSize]);

    if (!enabled || !snapshot) return null;

    return (
        <div
            ref={lensRef}
            className="kiosk-screen-magnifier"
            style={{
                width: lensSize,
                height: lensSize,
            }}
            aria-hidden
        >
            <div
                ref={sceneRef}
                className="kiosk-screen-magnifier-scene"
                style={{
                    width: snapshot.viewport.width,
                    height: snapshot.viewport.height,
                }}
            >
                <div ref={contentRef} className="kiosk-screen-magnifier-content">
                    <div
                        className="kiosk-screen-magnifier-capture"
                        style={{
                            left: snapshot.rect.left,
                            top: snapshot.rect.top,
                            width: snapshot.rect.width,
                            height: snapshot.rect.height,
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
        </div>
    );
}
