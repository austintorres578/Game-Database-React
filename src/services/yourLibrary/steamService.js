// Backend API services for Steam authentication and library sync.

import { BACKEND_BASE } from "../../constants/apiConfig";

/**
 * Checks whether this Firebase account has a Steam account linked.
 * Reads from Firestore via the backend, so it survives session expiry
 * and works across devices.
 * Returns { linked: boolean, steamId: string | null, errorMsg: string | null }.
 */
export async function checkSteamSession(uid) {
  if (!uid) return { linked: false, steamId: null, errorMsg: null };

  const res = await fetch(`${BACKEND_BASE}/api/steam/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-firebase-uid": uid,
    },
  });

  const data = await res.json().catch(() => ({}));
  return {
    linked: !!data?.linked,
    steamId: data?.steamId || null,
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
 * Unlinks the Steam account from this Firebase user. Deletes the stored
 * steamId in Firestore and tears down any Steam session.
 * Errors are silently ignored — the caller updates UI state.
 */
export async function logoutSteamSession(uid) {
  await fetch(`${BACKEND_BASE}/api/steam/unlink`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-firebase-uid": uid,
    },
  });
}
