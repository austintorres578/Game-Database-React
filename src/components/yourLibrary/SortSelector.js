import { getSortLabel } from "../../utils/yourLibrary/sortHelpers";

export default function SortSelector({
  sortBy,
  searchTerm,
  sortedGamesCount,
  onRevealDrop,
  onSortOptionClick,
}) {
  return (
    <div className="sort-by-con">
      {searchTerm.trim() ? (
        <h3 className="search-query-text">
          Searching for "{searchTerm.trim()}" ({sortedGamesCount} result
          {sortedGamesCount === 1 ? "" : "s"})
        </h3>
      ) : (
        <h3 className="search-query-text"></h3>
      )}
      <div className="sort-con">
        <p>Sort by</p>
        <div className="sorting">
          <button type="button" onClick={onRevealDrop}>
            {getSortLabel(sortBy)}
          </button>

          <div className="invisible">
            <button
              type="button"
              className={sortBy === "name_asc" ? "active" : ""}
              onClick={() => onSortOptionClick("name_asc")}
            >
              Name (A-Z)
            </button>

            <button
              type="button"
              className={sortBy === "name_desc" ? "active" : ""}
              onClick={() => onSortOptionClick("name_desc")}
            >
              Name (Z-A)
            </button>

            <button
              type="button"
              className={sortBy === "meta_desc" ? "active" : ""}
              onClick={() => onSortOptionClick("meta_desc")}
            >
              Metacritic (High-Low)
            </button>

            <button
              type="button"
              className={sortBy === "meta_asc" ? "active" : ""}
              onClick={() => onSortOptionClick("meta_asc")}
            >
              Metacritic (Low-High)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
