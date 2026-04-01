import { useRef } from "react";
import { useDraggableScroll } from "../../hooks/gamePage/useDraggableScroll";

export default function VideosRow({
  videos,
  onDeleteVideo,
  onOpenVideo,
  showInput,
  setShowInput,
  inputVal,
  setInputVal,
  inputError,
  onConfirmAdd,
}) {
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

  const inputRef = useRef(null);

  function handleShowInput() {
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") onConfirmAdd();
    if (e.key === "Escape") {
      setShowInput(false);
      setInputVal("");
    }
  }

  return (
    <section className="game-screenshots-section">
      <div className="screenshots-header">
        <h2>Videos</h2>
        <button className="video-add-btn" onClick={handleShowInput}>
          + Add Video
        </button>
      </div>

      {showInput && (
        <div className="video-url-input-bar">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a YouTube URL…"
            className={inputError ? "has-error" : ""}
          />
          {inputError && <span className="video-url-error">{inputError}</span>}
          <div className="video-url-input-actions">
            <button onClick={onConfirmAdd}>Add</button>
            <button
              onClick={() => {
                setShowInput(false);
                setInputVal("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {videos.length === 0 && !showInput ? (
        <p className="no-media-msg">No videos yet. Click "+ Add Video" to get started.</p>
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
          {videos.map((video, index) => (
            <div
              key={video.videoId + index}
              className="screenshot-card video-card"
              onClick={() => !isDragging && onOpenVideo(index)}
            >
              <div
                className="screenshot-img video-thumb"
                style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
              >
                <div className="video-play-icon">▶</div>
              </div>
              <button
                className="video-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteVideo(index);
                }}
                title="Remove video"
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
