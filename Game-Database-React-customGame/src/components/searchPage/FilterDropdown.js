export default function FilterDropdown({
  summary,
  hasValue,
  filters,
  isActive,
  onItemClick,
  filterClassName,
  onToggle,
}) {
  return (
    <div className="platform-game-toggle multi-toggle">
      <div
        className={`toggle${hasValue ? " has-value" : ""}`}
        onClick={onToggle}
      >
        <p className="toggle-selected">{summary}</p>
        <span>▾</span>
      </div>
      <div className={`filters ${filterClassName}`}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={"filter-btn" + (isActive(item) ? " active" : "")}
            onClick={() => onItemClick(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
