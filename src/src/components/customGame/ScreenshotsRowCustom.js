import { useRef } from "react";
import { useDraggableScroll } from "../../hooks/gamePage/useDraggableScroll";

export default function ScreenshotsRowCustom({
  screenshots,
  onAddScreenshots,
  onDeleteScreenshot,
  onOpenScreenshot,
}) {
  const fileInputRef = useRef(null);

  const {
    containerRef,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    stopDragging,
    handleTouchStart,
    handleTouchMove,
    stopDraggingTouch,
  } = useDraggableScroll();

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const newShots = files.map((file) => {
      const image = URL.createObjectURL(file);
      return { id: image, image };
    });
    onAddScreenshots(newShots);
    e.target.value = "";
  }

  return (
    <section className="game-screenshots-section">
      <div className="screenshots-header">
        <h2>Screenshots</h2>
        <button className="video-add-btn" onClick={() => fileInputRef.current.click()}>
          + Add Screenshots
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {screenshots.length === 0 ? (
        <p className="no-media-msg">No screenshots yet. Click "+ Add Screenshots" to upload.</p>
      ) : (
        <div
          ref={containerRef}
          className={`screenshots-row${isDragging ? " is-dragging" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDraggingTouch}
        >
          {screenshots.map((shot, index) => (
            <div
              key={shot.id}
              className="screenshot-card video-card"
              onClick={() => !isDragging && onOpenScreenshot(index)}
            >
              <div
                className="screenshot-img"
                style={{ backgroundImage: `url(${shot.image})` }}
              />
              <button
                className="video-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteScreenshot(shot.id);
                }}
                title="Remove screenshot"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
