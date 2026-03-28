import defaultBackground from "../../assets/images/noGameBackground.jpg";

export default function ScreenshotFullscreen({
  isOpen,
  fullscreenRef,
  onClose,
  activeIndex,
  screenshots,
  onPrev,
  onNext,
}) {
  if (!isOpen) return null;

  return (
    <div id="full-screenshot" className="full-screenshot" ref={fullscreenRef}>
      <button className="screenshot-close-btn" onClick={onClose}>
        X
      </button>
      <img
        src={
          activeIndex !== null && screenshots[activeIndex]
            ? screenshots[activeIndex].image
            : defaultBackground
        }
        alt="Full screenshot"
      />
      <div className="screenshot-buttons">
        <button onClick={onPrev}>Prev</button>
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
