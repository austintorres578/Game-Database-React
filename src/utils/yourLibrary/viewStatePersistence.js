// Helpers for saving and restoring the library view state
// (active group, status filter, page, sort, search term) in localStorage.

/**
 * Returns the localStorage key used to store view state for a given user.
 */
export function getLibraryViewStateKey(uid) {
  return uid ? `vgdb_libraryViewState_${uid}` : "vgdb_libraryViewState_guest";
}

/**
 * Reads the saved library view state for a user from localStorage.
 * Returns null if nothing is saved or the data cannot be parsed.
 */
export function readLibraryViewState(uid) {
  try {
    const raw = window.localStorage.getItem(getLibraryViewStateKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves the current library view state for a user to localStorage.
 */
export function writeLibraryViewState(uid, state) {
  try {
    window.localStorage.setItem(
      getLibraryViewStateKey(uid),
      JSON.stringify(state),
    );
  } catch {
    // ignore
  }
}
