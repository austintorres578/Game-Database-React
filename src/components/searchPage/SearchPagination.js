export default function SearchPagination({
  pageNumber,
  totalPages,
  pageOptions,
  isPageDropdownOpen,
  setIsPageDropdownOpen,
  dropdownRef,
  loading,
  onPrevPage,
  onNextPage,
  onGoToPage,
}) {
  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={onPrevPage}
        disabled={pageNumber <= 1}
      >
        ← Prev
      </button>

      <div
        className={"dropdown" + (isPageDropdownOpen ? " open" : "")}
        ref={dropdownRef}
      >
        <button
          className="dropdown-trigger"
          type="button"
          onClick={() => setIsPageDropdownOpen((v) => !v)}
        >
          Page {pageNumber} of {totalPages} <span className="chevron">▾</span>
        </button>

        {isPageDropdownOpen && (
          <div className="dropdown-menu">
            {pageOptions.map((n) => (
              <button
                key={n}
                type="button"
                className={
                  "dropdown-item" + (n === pageNumber ? " current-page" : "")
                }
                onClick={() => onGoToPage(n)}
              >
                Page {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="page-btn"
        onClick={onNextPage}
        disabled={pageNumber >= totalPages}
      >
        Next →
      </button>
    </div>
  );
}
