// Calls a callback whenever the user clicks outside the given element.
// Generic and reusable across any component that has a dismissible dropdown.

import { useEffect, useRef } from "react";

/**
 * @param {React.RefObject} ref          - Ref attached to the element to watch
 * @param {() => void}      onClickOutside - Called when a click outside is detected
 */
export function useClickOutside(ref, onClickOutside) {
  // Keep a stable ref to the callback so the effect doesn't re-run every render
  const handlerRef = useRef(onClickOutside);

  useEffect(() => {
    handlerRef.current = onClickOutside;
  }, [onClickOutside]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        handlerRef.current();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
