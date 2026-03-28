import { useEffect, useRef } from "react";

export default function ScreenshotModal({ screenshots, activeIndex, onClose, onPrev, onNext }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, onClose, onPrev, onNext]);

  if (activeIndex === null || !screenshots[activeIndex]) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className="video-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="video-modal">
        <button className="screenshot-close-btn video-modal-close" onClick={onClose}>
          X
        </button>
        <div className="video-modal-iframe-wrap">
          <img
            src={screenshots[activeIndex].image}
            alt={`Screenshot ${activeIndex + 1}`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
        {screenshots.length > 1 && (
          <div className="screenshot-buttons">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onNext}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
