/**
 * Converts a RAWG game ID to the string format used as the Firestore
 * library document ID. Returns null if no ID is provided.
 */
export function getLibraryDocId(rawgId) {
  if (rawgId === null || rawgId === undefined) return null;
  return String(rawgId);
}
