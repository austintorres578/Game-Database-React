import { Link } from "react-router-dom";

export default function LibraryStatsHeader({
  total,
  completed,
  loadingStats,
  onOpenImportPanel,
  onOpenTextImportPanel,
}) {
  return (
    <section className="library-header-card">
      <div className="library-header-main">
        <div className="library-kicker">
          <span className="library-kicker-dot"></span>
          <span>Your Library</span>
        </div>
        <h1>All your games in one place.</h1>
        <p>
          Track what you're playing, what you've finished, and what's still
          living in the backlog. Import your games by text, image, or through
          steam, and group together in anyway you want!
        </p>

        <div className="library-header-actions">
          <Link to="/search" className="btn btn-primary">
            Search For Game
          </Link>

          <Link to="/custom-game" className="btn btn-ghost">
            Create Custom Game
          </Link>

          <a href="#filter-settings">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onOpenImportPanel}
            >
              Import Games
            </button>
          </a>

        </div>
      </div>

      <div className="library-header-meta">
        <div className="library-stat total-game-stat">
          <div className="library-stat-label">Total games</div>
          <div className="library-stat-value">{loadingStats ? "…" : total}</div>
          <div className="library-stat-sub">
            {loadingStats ? "Loading…" : `${completed} completed`}
          </div>
        </div>
      </div>
    </section>
  );
}
