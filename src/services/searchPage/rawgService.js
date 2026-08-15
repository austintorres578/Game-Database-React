// Search-page data service. Talks to the IGDB backend proxy; function names
// kept as `*Rawg*` since callers (SearchPage.js, CustomGame.js) still use
// them and the backend returns RAWG-shaped objects.

import { BACKEND_BASE } from "../../constants/apiConfig";

/**
 * Searches games via the IGDB backend proxy.
 * Returns { count, results, next, previous } to match the old RAWG shape
 * so existing callers keep working.
 */
export async function fetchIgdbGames(query, limit = 12) {
  const url =
    `${BACKEND_BASE}/api/igdb/search?q=${encodeURIComponent(query || "")}` +
    `&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`IGDB search failed: HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    count: results.length,
    results,
    next: "",       // IGDB pagination handled differently; no next/prev URLs
    previous: "",
  };
}

/**
 * Fetches available platform filters from the IGDB backend.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, platformId: number }, ...]
 */
export async function fetchRawgPlatforms() {
  const res = await fetch(`${BACKEND_BASE}/api/igdb/platforms`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * Fetches available genre filters from the IGDB backend.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, slug: string, kind: "genre" }, ...]
 */
export async function fetchRawgGenres() {
  const res = await fetch(`${BACKEND_BASE}/api/igdb/genres`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

// IGDB's genre list is small (~100) and cached long-term on the backend, so
// "search" is just a client-side substring filter over the full list rather
// than a separate server-side search endpoint.
export async function searchRawgGenres(query) {
  if (!query.trim()) return [];
  const all = await fetchRawgGenres();
  const q = query.trim().toLowerCase();
  return all.filter((g) => g.label.toLowerCase().includes(q));
}

export async function searchRawgTags(query) {
  if (!query.trim()) return [];
  const all = await fetchRawgTags();
  const q = query.trim().toLowerCase();
  return all.filter((t) => t.label.toLowerCase().includes(q));
}

export async function autocompleteRawgGames(query) {
  if (!query.trim() || query.trim().length < 2) return [];
  const url =
    `${BACKEND_BASE}/api/igdb/autocomplete?q=${encodeURIComponent(query)}&limit=6`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((g) => ({
    id: g.id,
    name: g.name,
    released: g.released,
    background_image: g.background_image,
    genres: g.genres || [],
    metacritic: g.metacritic ?? null,
    rating: g.rating ?? null,
  }));
}

/**
 * Fetches available tag filters from the IGDB backend.
 * Returns an array of filter objects sorted alphabetically by name:
 * [{ id: string, label: string, slug: string, kind: "tag" }, ...]
 */
export async function fetchRawgTags() {
  const res = await fetch(`${BACKEND_BASE}/api/igdb/tags`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}
