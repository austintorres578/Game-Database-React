import { useState } from "react";
import { Link } from "react-router-dom";
import { gamePath } from "../../utils/slugify";
import plusIcon from "../../assets/images/plus-icon.png";
import { safeText } from "../../utils/yourLibrary/sortHelpers";
import { getPrimaryGenreFromGame } from "../../utils/yourLibrary/gameDataHelpers";

function GameCover({ imageUrl }) {
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl) {
    return <div className="game-img" />;
  }

  return (
    <div className={`game-img${loaded ? " is-loaded" : " is-loading"}`}>
      <img
        className="game-img-el"
        src={imageUrl}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

export default function GameGrid({
  loadingStats,
  pageGames,
  customFilters,
  onAddToGroup,
}) {
  return (
    <div className="game-grid">
      {loadingStats ? (
        Array.from({ length: 12 }).map((_, i) => (
          <div className="game-wrapper game-skeleton" key={`lib-skeleton-${i}`}>
            <div className="game-card">
              <div className="game-img skeleton-shimmer" />
              <div className="game-info">
                <div className="skeleton-line skeleton-shimmer skeleton-title" />
                <div className="skeleton-line skeleton-shimmer skeleton-sub" />
              </div>
            </div>
          </div>
        ))
      ) : pageGames.length === 0 ? (
        <p>No games match this filter yet.</p>
      ) : (
        pageGames.map((game) => {
          const imageUrl =
            safeText(game.backgroundImage) ||
            safeText(game.background_image) ||
            safeText(game.coverImage) ||
            safeText(game.image) ||
            "";

          const primaryGenre = getPrimaryGenreFromGame(game);

          const metacriticScore =
            game.metacritic ?? game.metacriticScore ?? game.metaScore ?? null;
          const hasScore =
            metacriticScore !== null && metacriticScore !== undefined;

          const groupTags = Array.from(
            new Set(
              customFilters
                .filter(
                  (g) =>
                    g.id !== "all-platforms" &&
                    g.id !== "ungrouped" &&
                    Array.isArray(g.gameIds) &&
                    g.gameIds.some((id) => String(id) === String(game.id)),
                )
                .map((g) => safeText(g.name, ""))
                .filter(Boolean),
            ),
          ).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
          );

          const gameHash = game.rawgId || game.slug || game.id;

          return (
            <div className="game-wrapper" key={String(game.id)}>
              <Link className="game-link" to={gamePath(gameHash, game.title || game.name)}>
                <div className={`game-card${game.isCustom ? " game-card--custom" : ""}`}>
                  <GameCover imageUrl={imageUrl} />

                  <div className="game-info">
                    <p className="game-title">
                      {safeText(game.title, "Untitled game")}
                    </p>
                    <div className="game-sub-info">
                      <p className="game-genre">
                        {primaryGenre || "Genre Unlisted"} •
                      </p>
                      <p className="game-meta">
                        {hasScore
                          ? `${metacriticScore}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {groupTags.length > 0 && (
                    <div className="game-group-tags">
                      {groupTags.map((name) => (
                        <span
                          key={`${game.id}-${name}`}
                          className="game-group-tag"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>

              <div className="add-button-con">
                <button
                  className="add-button"
                  type="button"
                  onClick={() => onAddToGroup(game.id)}
                >
                  <img src={plusIcon} alt="Add to group" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
