// Sorting comparators and helpers used to sort and display the game library.

/**
 * Sorts an array of strings alphabetically (case-insensitive).
 */
export function sortStringsAlpha(list) {
  return [...(list || [])].sort((a, b) =>
    String(a || "").localeCompare(String(b || ""), undefined, {
      sensitivity: "base",
    }),
  );
}

/**
 * Sorts an array of candidate objects alphabetically by their cleaned or raw title.
 */
export function sortCandidatesAlpha(list) {
  return [...(list || [])].sort((a, b) =>
    String(a.cleaned || a.raw || "").localeCompare(
      String(b.cleaned || b.raw || ""),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

/**
 * Extracts a numeric Metacritic score from a game object.
 * Returns null if no valid score is found (unrated).
 */
export function getMetacriticNumber(game) {
  const v =
    game?.metacritic ?? game?.metacriticScore ?? game?.metaScore ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Safely extracts a text string from a value that could be a string,
 * object, or number. Returns the fallback if nothing useful is found.
 */
export function safeText(v, fallback = "") {
  if (typeof v === "string") return v;
  if (v && typeof v === "object")
    return v.name || v.title || v.slug || fallback;
  if (typeof v === "number") return String(v);
  return fallback;
}

/**
 * Comparator for sorting games by title (A-Z or Z-A).
 */
export function compareByTitle(a, b, dir = "asc") {
  const ta = safeText(a?.title, "").trim();
  const tb = safeText(b?.title, "").trim();
  const cmp = ta.localeCompare(tb, undefined, { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

/**
 * Comparator for sorting games by Metacritic score.
 * Unrated games always sort to the bottom regardless of direction.
 * Ties are broken alphabetically by title.
 */
export function compareByMetacritic(a, b, dir = "desc") {
  const ma = getMetacriticNumber(a);
  const mb = getMetacriticNumber(b);

  const aMissing = ma === null;
  const bMissing = mb === null;
  if (aMissing && bMissing) return compareByTitle(a, b, "asc");
  if (aMissing) return 1;
  if (bMissing) return -1;

  const diff = ma - mb;
  if (diff === 0) return compareByTitle(a, b, "asc");
  return dir === "asc" ? diff : -diff;
}

/**
 * Returns the human-readable label for a given sort key.
 */
export function getSortLabel(sortValue) {
  switch (sortValue) {
    case "name_desc":
      return "Name (Z-A)";
    case "meta_desc":
      return "Metacritic (High-Low)";
    case "meta_asc":
      return "Metacritic (Low-High)";
    case "name_asc":
    default:
      return "Name (A-Z)";
  }
}
