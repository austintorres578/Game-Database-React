import { useEffect, useRef } from "react";

export default function VideoModal({ videos, activeIndex, onClose, onPrev, onNext }) {
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

  if (activeIndex === null || !videos[activeIndex]) return null;

  const video = videos[activeIndex];

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
          <iframe
            src={video.embedUrl}
            title={`Video ${activeIndex + 1}`}
            allowFullScreen
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
        </div>
        {videos.length > 1 && (
          <div className="screenshot-buttons">
            <button onClick={onPrev}>Prev</button>
            <button onClick={onNext}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
