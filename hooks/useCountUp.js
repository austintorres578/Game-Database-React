import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Restarts whenever `target` changes (e.g. after data loads).
 */
export function useCountUp(target, duration = 2000) {
  const [value, setValue] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined) return;

    clearInterval(timerRef.current);

    let current = 0;
    const step = target / (duration / 16);

    timerRef.current = setInterval(() => {
      current += step;
      if (current >= target) {
        setValue(target);
        clearInterval(timerRef.current);
      } else {
        setValue(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timerRef.current);
  }, [target, duration]);

  return value;
}
