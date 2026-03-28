// Helpers for normalizing genre and other game metadata fields
// that may arrive in inconsistent shapes from RAWG or Firestore.

/**
 * Normalizes a genre value to a plain string.
 * Handles string, object (with name/slug), or falsy values.
 */
export function normalizeGenre(g) {
  if (!g) return "";
  if (typeof g === "string") return g;
  if (typeof g === "object") return g.name || g.slug || "";
  return "";
}

/**
 * Returns the first genre from a game object as a plain string.
 * Checks common field names (genres, genreList, genre_names).
 */
export function getPrimaryGenreFromGame(game) {
  const genresArray =
    game?.genres || game?.genreList || game?.genre_names || [];
  if (Array.isArray(genresArray)) return normalizeGenre(genresArray[0]);
  return normalizeGenre(genresArray);
}
