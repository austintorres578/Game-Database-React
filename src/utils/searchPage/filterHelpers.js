// Pure helper functions for determining active filter state and
// computing the visible page number options for pagination.

/**
 * Returns true if the given platform filter button should appear active.
 * "All Platforms" is active when nothing is selected.
 */
export function isPlatformActive(p, selectedPlatforms) {
  if (p.id === "all") return selectedPlatforms.length === 0;
  return selectedPlatforms.includes(p.platformId);
}

/**
 * Returns true if the given genre filter button should appear active.
 * "All Genres" is active when nothing is selected.
 */
export function isGenreActive(g, selectedGenres) {
  if (g.id === "all") return selectedGenres.length === 0;
  return selectedGenres.includes(g.slug);
}

/**
 * Returns true if the given tag filter button should appear active.
 * "All Tags" is active when nothing is selected.
 */
export function isTagActive(t, selectedTags) {
  if (t.id === "all") return selectedTags.length === 0;
  return selectedTags.includes(t.slug);
}

/**
 * Computes which page numbers to show in the pagination dropdown.
 * Shows all pages when total <= 10; otherwise shows a 10-page window
 * centred around the current page.
 *
 * @param {number} totalPages
 * @param {number} pageNumber - The currently active page
 * @returns {number[]} Array of page numbers to render
 */
export function getPageOptions(totalPages, pageNumber) {
  if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

  let start = pageNumber - 4;
  let end = pageNumber + 5;

  if (start < 1) {
    start = 1;
    end = 10;
  }
  if (end > totalPages) {
    end = totalPages;
    start = totalPages - 9;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
