import downChevron from "../../assets/images/down_chevron.png";
import { safeText } from "../../utils/yourLibrary/sortHelpers";

export default function GroupPanel({
  filterName,
  onFilterNameChange,
  showGameSelection,
  onToggleGameSelection,
  selectedGroupGameIds,
  libraryGames,
  onToggleGameInGroup,
  editingGroupId,
  onSubmit,
  onDelete,
}) {
  return (
    <form onSubmit={onSubmit} className="cfs-form">
      <label className="cfs-field filter-name">
        <span className="cfs-label">Group name</span>
        <input
          type="text"
          placeholder="e.g. Co-op backlog, Short RPGs, Xbox 360"
          value={filterName}
          onChange={onFilterNameChange}
        />
      </label>

      <div className="game-selection-con">
        <div
          className="game-selection-toggle"
          onClick={onToggleGameSelection}
        >
          <div className="game-selection-count">
            <p>Game Selection</p>
            <span>{selectedGroupGameIds.length}</span>
          </div>

          <img
            className={`toggle-icon ${showGameSelection ? "active" : ""}`}
            src={downChevron}
            alt="Toggle game selection"
          />
        </div>
        <div>
          {/* <input type="checkbox">Remove From Group</input>
          <input type="checkbox">Remove From Library</input> */}
        </div>
        {showGameSelection && (
          <div className="game-selection-list">
            {libraryGames.length === 0 ? (
              <p>No games found.</p>
            ) : (
              libraryGames.map((game) => {
                const checked = selectedGroupGameIds
                  .map(String)
                  .includes(String(game.id));

                return (
                  <div
                    key={String(game.id)}
                    className={`filter-game${checked ? " selected-game" : ""}`}
                    onClick={() => onToggleGameInGroup(game.id)}
                  >
                    <p>{safeText(game.title, "Untitled game")}</p>
                    <input
                      type="checkbox"
                      checked={checked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleGameInGroup(game.id)}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="cfs-actions">
        {editingGroupId && (
          <button
            type="button"
            className="btn btn-primary delete-group-btn"
            onClick={onDelete}
          >
            Delete Group
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {editingGroupId ? "Save Changes" : "Save Group"}
        </button>
      </div>
    </form>
  );
}
