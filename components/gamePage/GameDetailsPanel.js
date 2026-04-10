export default function GameDetailsPanel({ gameData, onTagClick }) {
  return (
    <aside className="game-sidebar">
      <div className="game-panel">
        <h2 className="panel-title">Game details</h2>
        <p className="panel-sub">Quick facts at a glance.</p>

        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Release date</span>
            <span className="stat-value">
              {gameData.released || "Unknown"}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Developer</span>
            <span className="stat-value">
              {gameData.developers?.[0]?.name || "Unknown"}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Publisher</span>
            <span className="stat-value">
              {gameData.publishers?.[0]?.name || "Unknown"}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Age rating</span>
            <span className="stat-value">
              {gameData.esrb_rating?.name || "Unrated"}
            </span>
          </div>
        </div>
      </div>

      <div className="game-panel">
        <h2 className="panel-title">Tags</h2>
        <div className="game-tags-cloud">
          {gameData.tags?.length ? (
            gameData.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => onTagClick(tag)}
              >
                {tag.name}
              </button>
            ))
          ) : (
            <span>No tags</span>
          )}
        </div>
      </div>
    </aside>
  );
}
