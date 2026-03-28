// Scroll utility for the search page.

/**
 * Smoothly scrolls the window back to the top of the page.
 */
export function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
