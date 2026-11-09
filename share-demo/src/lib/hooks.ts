import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Measure an element's content box. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Mouse drag-to-scroll so swipe interactions (channel rows, carousel, long image) feel like touch
 * inside the Figma preview where most people use a mouse. Suppresses the click that ends a drag.
 */
export function useDragScroll<T extends HTMLElement>(axis: "x" | "y", opts?: { onEnd?: (el: T) => void }) {
  const ref = useRef<T | null>(null);
  const onEnd = useRef(opts?.onEnd);
  onEnd.current = opts?.onEnd;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startPos = 0;
    let startScroll = 0;
    let down = false;
    let dragged = false;
    let pid = -1;

    const pos = (e: PointerEvent) => (axis === "x" ? e.clientX : e.clientY);
    // account for the device preview being CSS-scaled
    const scale = () => {
      const r = el.getBoundingClientRect();
      const sz = axis === "x" ? el.offsetWidth : el.offsetHeight;
      const vis = axis === "x" ? r.width : r.height;
      return sz && vis ? vis / sz : 1;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      dragged = false;
      pid = e.pointerId;
      startPos = pos(e);
      startScroll = axis === "x" ? el.scrollLeft : el.scrollTop;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const d = (pos(e) - startPos) / scale();
      if (!dragged && Math.abs(d) > 4) {
        dragged = true;
        el.setPointerCapture(pid);
        el.classList.add("is-dragging");
      }
      if (dragged) {
        if (axis === "x") el.scrollLeft = startScroll - d;
        else el.scrollTop = startScroll - d;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      down = false;
      if (dragged) {
        el.classList.remove("is-dragging");
        try {
          el.releasePointerCapture(pid);
        } catch {
          /* noop */
        }
        onEnd.current?.(el);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [axis]);

  return ref;
}
