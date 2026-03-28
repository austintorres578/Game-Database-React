// Utility functions for Steam authentication and URL handling.

import { BACKEND_BASE } from "../../constants/apiConfig";

/**
 * Builds the Steam OAuth URL that redirects the user through the backend
 * and attaches their Firebase UID so the backend can link the accounts.
 */
export function steamAuthUrl(uid) {
  return `${BACKEND_BASE}/auth/steam?uid=${encodeURIComponent(uid)}`;
}

/**
 * Removes the ?steam=linked or ?steam=fail query param from the current URL
 * without triggering a page reload, so a refresh doesn't re-trigger the flow.
 */
export function stripSteamQueryParam() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("steam")) {
      url.searchParams.delete("steam");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch {
    // ignore
  }
}
