// Enables mouse and touch drag-to-scroll on a scrollable container.
// Attach the returned ref to the container and spread the returned handlers onto it.

import { useState, useRef } from "react";

/**
 * @returns {{
 *   containerRef: React.RefObject,
 *   isDragging: boolean,
 *   handleMouseDown: Function,
 *   handleMouseMove: Function,
 *   stopDragging: Function,
 *   handleTouchStart: Function,
 *   handleTouchMove: Function,
 *   stopDraggingTouch: Function,
 * }}
 */
export function useDraggableScroll() {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  function handleMouseDown(e) {
    if (!containerRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX - containerRef.current.offsetLeft;
    scrollStartX.current = containerRef.current.scrollLeft;
  }

  function handleMouseMove(e) {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    containerRef.current.scrollLeft = scrollStartX.current - (x - dragStartX.current);
  }

  function stopDragging() {
    setIsDragging(false);
  }

  function handleTouchStart(e) {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartX.current = touch.pageX - containerRef.current.offsetLeft;
    scrollStartX.current = containerRef.current.scrollLeft;
  }

  function handleTouchMove(e) {
    if (!isDragging || !containerRef.current) return;
    const touch = e.touches[0];
    const x = touch.pageX - containerRef.current.offsetLeft;
    containerRef.current.scrollLeft = scrollStartX.current - (x - dragStartX.current);
  }

  function stopDraggingTouch() {
    setIsDragging(false);
  }

  return {
    containerRef,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    stopDragging,
    handleTouchStart,
    handleTouchMove,
    stopDraggingTouch,
  };
}
