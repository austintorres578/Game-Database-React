// Manages the fullscreen screenshot viewer state and navigation.
// Also scrolls the fullscreen container into view when it opens.

import { useState, useRef, useEffect } from "react";

/**
 * @param {object[]} screenshots - Array of RAWG screenshot objects
 * @returns {{
 *   isFullScreenshotOpen: boolean,
 *   activeScreenshotIndex: number|null,
 *   fullscreenRef: React.RefObject,
 *   openScreenshot: (index: number) => void,
 *   closeScreenshot: () => void,
 *   showPrevScreenshot: () => void,
 *   showNextScreenshot: () => void,
 * }}
 */
export function useScreenshotGallery(screenshots) {
  const [isFullScreenshotOpen, setIsFullScreenshotOpen] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(null);
  const fullscreenRef = useRef(null);

  useEffect(() => {
    if (isFullScreenshotOpen && fullscreenRef.current) {
      fullscreenRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isFullScreenshotOpen]);

  function openScreenshot(index) {
    setActiveScreenshotIndex(index);
    setIsFullScreenshotOpen(true);
  }

  function closeScreenshot() {
    setIsFullScreenshotOpen(false);
    setActiveScreenshotIndex(null);
  }

  function showPrevScreenshot() {
    if (!screenshots.length || activeScreenshotIndex === null) return;
    setActiveScreenshotIndex(
      (prev) => (prev - 1 + screenshots.length) % screenshots.length,
    );
  }

  function showNextScreenshot() {
    if (!screenshots.length || activeScreenshotIndex === null) return;
    setActiveScreenshotIndex((prev) => (prev + 1) % screenshots.length);
  }

  return {
    isFullScreenshotOpen,
    activeScreenshotIndex,
    fullscreenRef,
    openScreenshot,
    closeScreenshot,
    showPrevScreenshot,
    showNextScreenshot,
  };
}
