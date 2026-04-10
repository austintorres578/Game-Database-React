export default function LibraryPagination({
  safeCurrentPage,
  totalPages,
  isPageDropdownOpen,
  setIsPageDropdownOpen,
  dropdownPages,
  onPrevPage,
  onNextPage,
  onGoToPage,
}) {
  return (
    <div className="pagination">
      <button
        className="page-btn"
        disabled={safeCurrentPage === 1}
        onClick={onPrevPage}
      >
        ‹ Prev
      </button>

      <div className={`dropdown ${isPageDropdownOpen ? "open" : ""}`}>
        <button
          className="dropdown-trigger"
          type="button"
          onClick={() => setIsPageDropdownOpen((prev) => !prev)}
        >
          Page {safeCurrentPage} of {totalPages} ▾
        </button>

        {isPageDropdownOpen && (
          <div className="dropdown-menu">
            {dropdownPages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`dropdown-item ${
                  pageNumber === safeCurrentPage ? "current-page" : ""
                }`}
                onClick={() => onGoToPage(pageNumber)}
              >
                Page {pageNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="page-btn"
        disabled={safeCurrentPage === totalPages}
        onClick={onNextPage}
      >
        Next ›
      </button>
    </div>
  );
}
