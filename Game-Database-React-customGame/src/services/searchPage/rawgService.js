// RAWG API service for the search page.
// Handles all outbound requests to the RAWG video-games database.

const RAWG_ORIGIN = "https://rawg-video-games-database.p.rapidapi.com/";
const RAWG_QUERY_KEY = "99cd09f6c33b42b5a24a9b447ee04a81";
const RAWG_HEADERS = {
  "X-RapidAPI-key": "c9d7675297msh7c0392e178bd12cp1541a1jsn774cfdd0879c",
  "X-RapidAPI-Host": "rawg-video-games-database.p.rapidapi.com",
};

/**
 * Builds the base RAWG games URL (without page number or filters appended).
 * The caller passes this to buildLink() from utils/searchPage/buildLink.js.
 *
 * @param {number} pageSize - Number of results to request per page
 * @returns {string}
 */
export function buildRawgFetchBase(pageSize) {
  return `${RAWG_ORIGIN}games?key=${RAWG_QUERY_KEY}&search_exact=true&ordering=-metacritic&page_size=${pageSize}&`;
}

/**
 * Fetches a page of game results from RAWG.
 * Returns the raw response data ({ count, results, next, previous }).
 *
 * @param {string} link - The fully built RAWG request URL
 */
export async function fetchRawgGames(link) {
  const res = await fetch(link, { method: "GET", headers: RAWG_HEADERS });
  const data = await res.json();
  return {
    count: data.count || 0,
    results: data.results || [],
    next: data.next || "",
    previous: data.previous || "",
  };
}

/**
 * Fetches available platform filters from RAWG.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, platformId: number }, ...]
 */
export async function fetchRawgPlatforms() {
  const res = await fetch(
    `${RAWG_ORIGIN}platforms?key=${RAWG_QUERY_KEY}&page_size=50`,
    { method: "GET", headers: RAWG_HEADERS },
  );
  const data = await res.json();
  const sorted = (data.results || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return sorted.map((p) => ({
    id: String(p.id),
    label: p.name,
    platformId: p.id,
  }));
}

/**
 * Fetches available genre filters from RAWG.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, slug: string, kind: "genre" }, ...]
 */
export async function fetchRawgGenres() {
  const res = await fetch(
    `${RAWG_ORIGIN}genres?key=${RAWG_QUERY_KEY}&page_size=40`,
    { method: "GET", headers: RAWG_HEADERS },
  );
  const data = await res.json();
  const sorted = (data.results || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return sorted.map((g) => ({
    id: String(g.id),
    label: g.name,
    slug: g.slug,
    kind: "genre",
  }));
}

/**
 * Fetches available tag filters from RAWG.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, slug: string, kind: "tag" }, ...]
 */
export async function fetchRawgTags() {
  const res = await fetch(
    `${RAWG_ORIGIN}tags?key=${RAWG_QUERY_KEY}&page_size=40`,
    { method: "GET", headers: RAWG_HEADERS },
  );
  const data = await res.json();
  if (!data.results) return [];
  const sorted = data.results.sort((a, b) => a.name.localeCompare(b.name));
  return sorted.map((t) => ({
    id: String(t.id),
    label: t.name,
    slug: t.slug,
    kind: "tag",
  }));
}
