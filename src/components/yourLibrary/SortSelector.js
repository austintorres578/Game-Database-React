import { getSortLabel } from "../../utils/yourLibrary/sortHelpers";

export default function SortSelector({
  sortBy,
  canUseCustomOrder,
  onRevealDrop,
  onSortOptionClick,
}) {
  return (
    <div className="sort-by-con">
      <div className="sort-con">
        {/* <p>Sort by</p> */}
        <div className="sorting">
          <button type="button" onClick={onRevealDrop}>
            {getSortLabel(sortBy)}
          </button>

          <div className="invisible">
            <button
              type="button"
              className={sortBy === "custom_order" ? "active" : ""}
              disabled={!canUseCustomOrder}
              style={{ opacity: canUseCustomOrder ? 1 : 0.45 }}
              onClick={() => canUseCustomOrder && onSortOptionClick("custom_order")}
              title={
                canUseCustomOrder
                  ? "Order by your saved group arrangement"
                  : "Select a single group to use custom order"
              }
            >
              Custom Order
            </button>

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

            <button
              type="button"
              className={sortBy === "added_desc" ? "active" : ""}
              onClick={() => onSortOptionClick("added_desc")}
            >
              Added (Newest)
            </button>

            <button
              type="button"
              className={sortBy === "added_asc" ? "active" : ""}
              onClick={() => onSortOptionClick("added_asc")}
            >
              Added (Oldest)
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
