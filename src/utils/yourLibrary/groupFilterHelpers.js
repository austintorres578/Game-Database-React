// Helpers for checking game membership in groups and the "ungrouped" filter.

/**
 * Builds a Set of all game IDs that belong to at least one real group
 * (excludes the permanent "all-platforms" and "ungrouped" entries).
 */
export function getGroupedIdSetFromCustomFilters(filters) {
  const set = new Set();
  (filters || []).forEach((g) => {
    if (g.id === "all-platforms" || g.id === "ungrouped") return;
    if (Array.isArray(g.gameIds)) {
      g.gameIds.forEach((id) => set.add(String(id)));
    }
  });
  return set;
}

/**
 * Returns true if the given game ID is inside a specific group.
 */
export function isGameInGroup(filters, groupId, gameId) {
  const gid = String(gameId);
  const group = (filters || []).find((g) => g.id === groupId);
  if (!group || !Array.isArray(group.gameIds)) return false;
  return group.gameIds.some((x) => String(x) === gid);
}

/**
 * Returns true if the given game ID does not belong to any real group.
 */
export function isGameUngrouped(filters, gameId) {
  const gid = String(gameId);
  const groupedSet = getGroupedIdSetFromCustomFilters(filters);
  return !groupedSet.has(gid);
}
