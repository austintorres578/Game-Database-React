import { Link } from "react-router-dom";
import checkIcon from "../../assets/images/check-icon.png";
import { getPrimaryGenre } from "../../utils/userProfile/gameHelpers";

export default function CompletedGamesSection({
  completedGames,
  paginatedCompletedGames,
  completedPerPage,
  safeCompletedPage,
  totalCompletedPages,
  onPageChange,
}) {
  return (
    <section className="completed-section">
      <h2>Completed</h2>
      <div className="completed-container">
        {completedGames.length === 0 ? (
          <p className="profile-empty-state">
            You haven't completed any games yet.
          </p>
        ) : (
          paginatedCompletedGames.map((game) => (
            <Link
              key={game.id}
              to={`/game#${game.id}`}
              className="completed-game-card"
            >
              <div className="select-icon">
                <img src={checkIcon} alt="Selected" />
              </div>
              <div
                className="completed-game-cover"
                style={{
                  backgroundImage: game.background_image
                    ? `url(${game.background_image})`
                    : "none",
                }}
              ></div>
              <div className="completed-game-body">
                <p className="completed-game-title">
                  {game.name || "Untitled game"}
                </p>
                <div className="completed-game-meta">
                  <span>{getPrimaryGenre(game)}</span>
                  <span className="completed-game-rating">
                    {game.metacritic ?? "N/A"}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {completedGames.length > completedPerPage && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={safeCompletedPage === 1}
            onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          >
            ‹ Prev
          </button>

          <span className="page-info">
            Page {safeCompletedPage} of {totalCompletedPages}
          </span>

          <button
            className="page-btn"
            disabled={safeCompletedPage === totalCompletedPages}
            onClick={() =>
              onPageChange((p) => Math.min(totalCompletedPages, p + 1))
            }
          >
            Next ›
          </button>
        </div>
      )}
    </section>
  );
}
