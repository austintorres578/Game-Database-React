// Pure game data helpers for the user profile page.

/**
 * Returns the first genre name from a game object's genres array.
 * Falls back to "Unknown genre" if the array is empty or missing.
 *
 * @param {{ genres?: string[] }} game
 * @returns {string}
 */
export function getPrimaryGenre(game) {
  if (!Array.isArray(game.genres) || game.genres.length === 0) return "Unknown genre";
  const g = game.genres[0];
  return typeof g === "string" ? g : g?.name || "Unknown genre";
}
