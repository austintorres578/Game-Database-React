// Backend API + Firestore services for searching games and saving them
// to the user's library during the import flow.

import { doc, setDoc, db } from "../../firebase/firestore";

const BACKEND_BASE = "https://game-database-backend.onrender.com";

/**
 * Searches for a game by title using the backend RAWG proxy.
 * Returns an array of result objects, or an empty array if nothing is found.
 * Throws if the request itself fails.
 */
export async function searchGameByTitle(query) {
  const url = `${BACKEND_BASE}/api/search-game?q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Search failed");

  return Array.isArray(data?.results) ? data.results : [];
}

/**
 * Saves (or merges) a game document into the user's Firestore library.
 */
export async function saveGameToLibraryFirestore(userId, docId, payload) {
  const gameDocRef = doc(db, "users", userId, "library", docId);
  await setDoc(gameDocRef, payload, { merge: true });
}
