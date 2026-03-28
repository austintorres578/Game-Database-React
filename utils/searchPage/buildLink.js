// Builds a RAWG API request URL from the base fetch link and active filters.

/**
 * Appends search term, platform IDs, genre slugs, tag slugs, and page number
 * to the provided RAWG base URL.
 *
 * @param {string} baseUrl    - The base RAWG URL (includes API key + page_size)
 * @param {string} term       - The search term entered by the user
 * @param {number[]} platformsArr - Array of selected platform IDs
 * @param {string[]} genresArr    - Array of selected genre slugs
 * @param {string[]} tagsArr      - Array of selected tag slugs
 * @param {number} page           - Page number (default 1)
 * @returns {string} The fully constructed request URL
 */
export function buildLink(baseUrl, term, platformsArr, genresArr, tagsArr, page = 1, ordering = "-metacritic") {
  let link = baseUrl;
  link += `page=${page}`;

  if (ordering) link += `&ordering=${ordering}`;
  if (term.trim()) link += `&search=${encodeURIComponent(term.trim())}`;
  if (platformsArr.length > 0) link += `&platforms=${platformsArr.join(",")}`;
  if (genresArr.length > 0) link += `&genres=${genresArr.join(",")}`;
  if (tagsArr.length > 0) link += `&tags=${tagsArr.join(",")}`;

  return link;
}
