import { getLibraryDocId } from "../../utils/gamePage/libraryDocId";

export default function GameHeroActions({
  gameData,
  auth,
  isInLibrary,
  isCompleted,
  isFavorite,
  savingLibrary,
  savingCompleted,
  savingFavorite,
  onToggleLibrary,
  onToggleCompleted,
  onToggleFavorite,
  userGroups,
  groupDropdownOpen,
  setGroupDropdownOpen,
  savingGroupId,
  onToggleGroup,
}) {
  return (
    <div className="game-hero-actions">
      {/* Library toggle */}
      <button
        className={
          "btn btn-primary in-library" +
          (isInLibrary ? " successfully-favorited" : "")
        }
        onClick={onToggleLibrary}
        disabled={savingLibrary || savingFavorite || savingCompleted}
      >
        {savingLibrary
          ? " Updating..."
          : isInLibrary
            ? "Remove from Library"
            : "Add to Library"}
      </button>

      {/* Completed toggle */}
      <button
        className={
          "btn btn-ghost completed-button" +
          (isCompleted ? " completed-button--active" : "")
        }
        onClick={onToggleCompleted}
        disabled={savingCompleted || savingLibrary || savingFavorite}
      >
        {savingCompleted
          ? "Updating..."
          : isCompleted
            ? "Unmark Completed"
            : "Mark as Completed"}
      </button>

      {/* Favorite toggle */}
      <button
        className={
          "btn btn-ghost favorite-button" +
          (isFavorite ? " favorite-button--active" : "")
        }
        onClick={onToggleFavorite}
        disabled={savingFavorite || savingLibrary || savingCompleted}
      >
        {savingFavorite
          ? "Updating..."
          : isFavorite
            ? "Unfavorite game"
            : "Favorite game"}
      </button>

      {/* Group dropdown */}
      {auth.currentUser && userGroups.length > 0 && (
        <div
          className={
            "dropdown group-dropdown" + (groupDropdownOpen ? " open" : "")
          }
        >
          <button
            type="button"
            className="btn btn-ghost dropdown-trigger"
            onClick={() => setGroupDropdownOpen((prev) => !prev)}
          >
            Add to Group ▾
          </button>

          {groupDropdownOpen && (
            <div className="dropdown-menu">
              {userGroups.map((group) => {
                const libraryDocId = getLibraryDocId(gameData.id);
                const inGroup = Array.isArray(group.gameIds)
                  ? group.gameIds.some(
                      (id) => String(id) === String(libraryDocId),
                    )
                  : false;

                const isBusy = savingGroupId === group.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={
                      "dropdown-item" + (inGroup ? " in-group" : "")
                    }
                    disabled={isBusy}
                    onClick={() => onToggleGroup(group.id)}
                    title={
                      inGroup
                        ? "Click to remove from this group"
                        : "Click to add to this group"
                    }
                  >
                    <span className="dropdown-item-label">{group.name}</span>
                    <span className="dropdown-item-status">
                      {isBusy
                        ? "Updating..."
                        : inGroup
                          ? "✓ In group (click to remove)"
                          : "＋ Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
