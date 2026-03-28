import { safeText } from "../../utils/yourLibrary/sortHelpers";

export default function StatusFiltersBar({
  statusFilter,
  onStatusFilterChange,
  loadingStats,
  groupStats,
  customFilters,
  safeActiveGroupIds,
  onToggleGroup,
  realSelectedGroupIds,
  onHeaderAddToGroup,
  onOpenNewGroupPanel,
}) {
  return (
    <section>
      <div className="library-filters">
        <div>
          <button
            className={`filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
            onClick={() => onStatusFilterChange("all")}
          >
            <span>All</span>
            <span className="filter-count">
              {loadingStats ? "…" : groupStats.total}
            </span>
          </button>

          <button
            className={`filter-pill ${statusFilter === "backlog" ? "is-active" : ""}`}
            onClick={() => onStatusFilterChange("backlog")}
          >
            <span>Backlog</span>
            <span className="filter-count">
              {loadingStats ? "…" : groupStats.backlog}
            </span>
          </button>

          <button
            className={`filter-pill ${statusFilter === "completed" ? "is-active" : ""}`}
            onClick={() => onStatusFilterChange("completed")}
          >
            <span>Completed</span>
            <span className="filter-count">
              {loadingStats ? "…" : groupStats.completed}
            </span>
          </button>
        </div>

        <a href="#filter-settings">
          <button className="btn btn-primary" onClick={onOpenNewGroupPanel}>
            Create New Group
          </button>
        </a>
      </div>

      <div className="custom-filters-con">
        <h3>Your Groups</h3>
        <div className="custom-filters">
          {customFilters.map((f) => (
            <button
              key={f.id}
              className={`filter-pill ${safeActiveGroupIds.includes(f.id) ? "is-active" : ""}`}
              onClick={() => onToggleGroup(f.id)}
            >
              {safeText(f.name, "Group")}
            </button>
          ))}

          {realSelectedGroupIds.length === 1 && (
            <a href="#filter-settings" className="add-to-group-con">
              <button
                type="button"
                className="add-to-group btn btn-primary"
                onClick={onHeaderAddToGroup}
              >
                Manage Group
              </button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
