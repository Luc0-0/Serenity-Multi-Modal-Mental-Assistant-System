import { useEffect, useRef } from 'react';

// Detects edge swipes via trackpad scroll, mouse drag, and touch.
export function useEdgeSwipe({
    edge = 'left',
    edgeZone = 80,
    threshold = 40,
    isOpen = false,
    onOpen,
    onClose,
    enabled = true,
}) {
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);
    const isOpenRef = useRef(isOpen);
    const enabledRef = useRef(enabled);

    useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    useEffect(() => {
        let mouseX = -1;
        let accDelta = 0;
        let resetTimer = null;
        let triggered = false;

        // Always track cursor position
        const onMouseMove = (e) => { mouseX = e.clientX; };

        const resetAccumulator = () => {
            accDelta = 0;
            triggered = false;
        };

        // Trackpad scroll near edges
        const onWheel = (e) => {
            if (!enabledRef.current) return;
            // If mouse position unknown, use edge heuristic based on recent movement
            if (mouseX < 0) return;

            const sw = window.innerWidth;
            const nearLeft = mouseX <= edgeZone;
            const nearRight = mouseX >= sw - edgeZone;

            // Determine what actions are possible
            const canOpen = !isOpenRef.current && (
                (edge === 'left' && nearLeft) || (edge === 'right' && nearRight)
            );
            const canClose = isOpenRef.current && (
                (edge === 'left' && mouseX <= 400) || (edge === 'right' && mouseX >= sw - 400)
            );

            if (!canOpen && !canClose) return;

            // Use horizontal delta; fall back to vertical if horizontal is negligible
            // (some trackpads/mice emit deltaY for what feels like horizontal movement)
            let dx = e.deltaX;
            if (Math.abs(dx) < 2 && Math.abs(e.deltaY) > 5) {
                // Near edge + mostly vertical scroll — ignore, it's just page scrolling
                return;
            }
            if (dx === 0) return;

            accDelta += dx;

            clearTimeout(resetTimer);
            resetTimer = setTimeout(resetAccumulator, 500);

            if (triggered) return;

            if (edge === 'left') {
                if (!isOpenRef.current && accDelta > threshold) {
                    triggered = true; accDelta = 0; onOpenRef.current?.();
                } else if (isOpenRef.current && accDelta < -threshold) {
                    triggered = true; accDelta = 0; onCloseRef.current?.();
                }
            } else {
                if (!isOpenRef.current && accDelta < -threshold) {
                    triggered = true; accDelta = 0; onOpenRef.current?.();
                } else if (isOpenRef.current && accDelta > threshold) {
                    triggered = true; accDelta = 0; onCloseRef.current?.();
                }
            }
        };

        // Mouse click-and-drag from edges
        let dragStartX = null;
        let dragStartY = null;
        let isDragging = false;

        const onMouseDown = (e) => {
            if (!enabledRef.current) return;
            const sw = window.innerWidth;
            const near = edge === 'left' ? e.clientX <= edgeZone : e.clientX >= sw - edgeZone;

            if ((!isOpenRef.current && near) || isOpenRef.current) {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
            }
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const dx = e.clientX - dragStartX;
            const dy = Math.abs(e.clientY - dragStartY);
            if (dy > Math.abs(dx) * 1.2 || Math.abs(dx) < threshold) return;

            if (edge === 'left') {
                if (!isOpenRef.current && dx > 0) onOpenRef.current?.();
                else if (isOpenRef.current && dx < 0) onCloseRef.current?.();
            } else {
                if (!isOpenRef.current && dx < 0) onOpenRef.current?.();
                else if (isOpenRef.current && dx > 0) onCloseRef.current?.();
            }
        };

        // Touch swipe (mobile)
        let touchStartX = null;
        let touchStartY = null;

        const onTouchStart = (e) => {
            if (!enabledRef.current) return;
            const t = e.touches[0];
            const sw = window.innerWidth;
            const near = edge === 'left' ? t.clientX <= edgeZone : t.clientX >= sw - edgeZone;

            if ((!isOpenRef.current && near) || isOpenRef.current) {
                touchStartX = t.clientX;
                touchStartY = t.clientY;
            }
        };

        const onTouchEnd = (e) => {
            if (touchStartX === null) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - touchStartX;
            const dy = Math.abs(t.clientY - touchStartY);
            touchStartX = null;

            if (dy > Math.abs(dx) * 1.2 || Math.abs(dx) < threshold) return;

            if (edge === 'left') {
                if (!isOpenRef.current && dx > 0) onOpenRef.current?.();
                else if (isOpenRef.current && dx < 0) onCloseRef.current?.();
            } else {
                if (!isOpenRef.current && dx < 0) onOpenRef.current?.();
                else if (isOpenRef.current && dx > 0) onCloseRef.current?.();
            }
        };

        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('wheel', onWheel, { passive: true });
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('wheel', onWheel);
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchend', onTouchEnd);
            clearTimeout(resetTimer);
        };
    }, [edge, edgeZone, threshold]);
}

export default useEdgeSwipe;
