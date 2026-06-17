export default function ScreenshotsRow({
  gameScreenshots,
  screenshotsLoading,
  isDragging,
  containerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onOpenScreenshot,
}) {
  return (
    <section className="game-screenshots-section">
      <div className="screenshots-header">
        <h2>Screenshots</h2>
        {/* <span>Scroll horizontally or drag to view more.</span> */}
      </div>

      <div
        className={`screenshots-row${isDragging ? " is-dragging" : ""}`}
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {screenshotsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="screenshot-card" key={`shot-skeleton-${i}`}>
              <div className="screenshot-img cover-shimmer" />
            </div>
          ))
        ) : gameScreenshots.length > 0 ? (
          gameScreenshots.map((shot, index) => (
            <button
              type="button"
              className="screenshot-card"
              key={shot.id}
              onClick={() => onOpenScreenshot(index)}
            >
              <div
                className="screenshot-img"
                style={{ backgroundImage: `url(${shot.image})` }}
              ></div>
            </button>
          ))
        ) : (
          <div className="no-images">
            <h3>No Images</h3>
          </div>
        )}
      </div>
    </section>
  );
}
