// Backend API services for Steam authentication and library sync.

const BACKEND_BASE = "https://game-database-backend.onrender.com";

/**
 * Checks whether the current browser session is linked to a Steam account.
 * Returns { linked: boolean, errorMsg: string | null }.
 */
export async function checkSteamSession() {
  const res = await fetch(`${BACKEND_BASE}/api/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  return {
    linked: !!data?.loggedIn,
    errorMsg: data?.error || null,
  };
}

/**
 * Fetches the list of owned game titles from the user's Steam library.
 * Requires the Steam session to already be linked (call checkSteamSession first).
 * Returns an array of game title strings.
 * Throws if the request fails or Steam reports the user is not logged in.
 */
export async function fetchSteamOwnedGameTitles(uid) {
  const res = await fetch(`${BACKEND_BASE}/api/steam/owned-games`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-firebase-uid": uid,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = String(data?.error || data?.message || "");
    throw new Error(errMsg || "Could not fetch Steam library.");
  }

  return Array.isArray(data?.titles)
    ? data.titles
    : Array.isArray(data?.games)
      ? data.games.map((g) => g?.name).filter(Boolean)
      : [];
}

/**
 * Logs the current session out of Steam by calling the backend logout endpoint.
 * Errors are silently ignored — the caller is responsible for updating UI state.
 */
export async function logoutSteamSession() {
  await fetch(`${BACKEND_BASE}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
}
