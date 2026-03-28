export default function LibrarySearchBar({
  searchTerm,
  onSearchChange,
  onClear,
}) {
  return (
    <section className="library-search-bar" style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search your library..."
          style={{
            flex: 1,
            minWidth: "240px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(0,0,0,0.25)",
            color: "white",
          }}
        />

        {searchTerm.trim() && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
