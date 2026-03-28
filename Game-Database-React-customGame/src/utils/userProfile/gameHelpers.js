// Pure game data helpers for the user profile page.

/**
 * Returns the first genre name from a game object's genres array.
 * Falls back to "Unknown genre" if the array is empty or missing.
 *
 * @param {{ genres?: string[] }} game
 * @returns {string}
 */
export function getPrimaryGenre(game) {
  return Array.isArray(game.genres) && game.genres.length > 0
    ? game.genres[0]
    : "Unknown genre";
}
