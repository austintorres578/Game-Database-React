// Helpers for the scan/text/Steam import flow:
// normalizing search results, matching titles, and building candidate lists.

import {
  safeText,
  sortStringsAlpha,
  sortCandidatesAlpha,
} from "./sortHelpers";

/**
 * Extracts the best available unique ID from a RAWG search result object.
 */
export function getResultId(r) {
  return (
    r?.rawgId || r?.id || r?.gameId || r?.slug || r?.name || r?.title || null
  );
}

/**
 * Converts a raw RAWG search result into the shape expected by
 * the Firestore library document.
 */
export function normalizeResultToLibraryDoc(r) {
  const title =
    r?.name || r?.title || r?.gameTitle || r?.slug || "Untitled game";

  const backgroundImage =
    r?.background_image ||
    r?.backgroundImage ||
    r?.image ||
    r?.coverImage ||
    "";

  const genres =
    r?.genres ||
    r?.genreList ||
    r?.genre_names ||
    (Array.isArray(r?.tags) ? r.tags : []);

  const metacritic =
    r?.metacritic ?? r?.metacriticScore ?? r?.metaScore ?? null;

  const platforms =
    r?.platforms ||
    r?.parent_platforms ||
    r?.platform ||
    r?.platformName ||
    "";

  return {
    title,
    rawgId: r?.id ?? r?.rawgId ?? null,
    slug: r?.slug ?? null,
    backgroundImage,
    genres,
    metacritic,
    platforms,
    status: "backlog",
    _source: "scan_match",
    _raw: r || null,
  };
}

/**
 * Normalizes a string for fuzzy title matching:
 * lowercases, replaces & with "and", strips non-alphanumeric characters.
 */
export function normalizeKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Extracts a plain text title from a RAWG search result.
 */
export function getResultTitle(r) {
  return safeText(r?.name) || safeText(r?.title) || safeText(r?.slug) || "";
}

/**
 * Picks the best matching result from a list of RAWG search results.
 * Prefers an exact title match (after normalization), otherwise returns
 * the first result.
 */
export function pickBestResult(results, queryTitle) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const q = normalizeKey(queryTitle);
  const exact = results.find((r) => normalizeKey(getResultTitle(r)) === q);
  if (exact) return exact;

  return results[0];
}

/**
 * Converts an array of title strings into a sorted, deduplicated array of
 * candidate objects ready for the import UI.
 * Each candidate has: { id, raw, cleaned }
 *
 * @param {string[]} titles - Raw title strings
 * @param {string} idPrefix - Prefix for generated candidate IDs (e.g. "steam", "manual")
 */
export function titlesToCandidates(titles, idPrefix = "steam") {
  const seen = new Set();
  const uniq = [];

  for (const t of titles || []) {
    const s = String(t || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }

  const sortedTitles = sortStringsAlpha(uniq);

  const now = Date.now();
  const nextCandidatesRaw = sortedTitles.map((t, idx) => ({
    id: `${idPrefix}_${now}_${idx}`,
    raw: t,
    cleaned: t,
  }));
  const nextCandidates = sortCandidatesAlpha(nextCandidatesRaw);

  return { sortedTitles, nextCandidates };
}

/**
 * Parses a textarea value into a deduplicated array of game title strings
 * (one title per line, blank lines ignored).
 */
export function parseTitlesFromTextarea(text) {
  const lines = String(text || "")
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const seen = new Set();
  const uniq = [];
  for (const t of lines) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(t);
  }
  return uniq;
}
