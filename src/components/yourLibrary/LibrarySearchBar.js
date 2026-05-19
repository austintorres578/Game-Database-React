import SortSelector from "./SortSelector";

export default function LibrarySearchBar({
  searchTerm,
  onSearchChange,
  onClear,
  sortBy,
  sortedGamesCount,
  onRevealDrop,
  onSortOptionClick,
}) {
  return (
    <section className="library-search-bar" style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div className="input-con">
          {searchTerm.trim() ? (
            <h3 className="search-query-text">
              Searching for "{searchTerm.trim()}" ({sortedGamesCount} result
              {sortedGamesCount === 1 ? "" : "s"})
            </h3>
          ) : (
            <></>
          )}
          <div className="search-wrapper">
            <div className="input-wrapper">
              <input
                type="text"
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Search your library..."
              />
            </div>
            <SortSelector
              sortBy={sortBy}
              onRevealDrop={onRevealDrop}
              onSortOptionClick={onSortOptionClick}
            />
          </div>
        </div>

        {searchTerm.trim() && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
