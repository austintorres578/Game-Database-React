import { getPlaceholderBackground } from "../../utils/placeholderBackground";

export default function ScreenshotFullscreen({
  isOpen,
  fullscreenRef,
  onClose,
  activeIndex,
  screenshots,
  onPrev,
  onNext,
  gameTitle,
}) {
  if (!isOpen) return null;

  return (
    <div id="full-screenshot" className="full-screenshot" ref={fullscreenRef}>
      <button className="screenshot-close-btn" onClick={onClose}>
        ✕
      </button>
      <img
        src={
          activeIndex !== null && screenshots[activeIndex]
            ? screenshots[activeIndex].image
            : getPlaceholderBackground(gameTitle)
        }
        alt="Full screenshot"
      />
      <div className="screenshot-buttons">
        <button onClick={onPrev}>‹</button>
        <button onClick={onNext}>›</button>
      </div>
    </div>
  );
}
