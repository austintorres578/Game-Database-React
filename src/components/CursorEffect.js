import { useEffect, useRef } from "react";

export default function CursorEffect() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Skip on touch/coarse-pointer devices (mobile)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let rafId;

    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
    };

    function animateRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      rafId = requestAnimationFrame(animateRing);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = requestAnimationFrame(animateRing);

    const interactiveSelectors = "a, button, [role='button'], input, select, textarea, label";

    const addHover = (e) => {
      if (e.target.closest(interactiveSelectors)) {
        ring.classList.add("hovering");
      }
    };
    const removeHover = (e) => {
      if (e.target.closest(interactiveSelectors)) {
        ring.classList.remove("hovering");
      }
    };

    document.addEventListener("mouseover", addHover);
    document.addEventListener("mouseout", removeHover);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", addHover);
      document.removeEventListener("mouseout", removeHover);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />
    </>
  );
}
