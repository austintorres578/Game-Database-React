import { Link } from "react-router-dom";
import { getPrimaryGenre } from "../../utils/userProfile/gameHelpers";

export default function FavoriteGamesSection({ favoriteGames }) {
  return (
    <article className="profile-panel">
      <div className="profile-panel-header">
        <h2>Top Games</h2>
        <span>Click a game to view details.</span>
      </div>

      <div className="favorite-games-row">
        {favoriteGames.length === 0 ? (
          <p className="profile-empty-state">
            You haven't favorited any games yet.
          </p>
        ) : (
          favoriteGames.slice(0, 12).map((game) => (
            <Link
              key={game.id}
              to={`/game#${game.id}`}
              className="favorite-game-card"
            >
              <div
                className="favorite-game-cover"
                style={{
                  backgroundImage: game.background_image
                    ? `url(${game.background_image})`
                    : "none",
                }}
              ></div>
              <div className="favorite-game-body">
                <p className="favorite-game-title">
                  {game.name || "Untitled game"}
                </p>
                <div className="favorite-game-meta">
                  <span>{getPrimaryGenre(game)}</span>
                  <span className="favorite-game-rating">
                    {game.metacritic ?? "N/A"}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}
