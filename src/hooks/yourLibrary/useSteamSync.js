import { useEffect, useRef, useState } from "react";
import {
  checkSteamSession,
  fetchSteamOwnedGameTitles,
} from "../../services/yourLibrary/steamService";
import {
  steamAuthUrl,
  stripSteamQueryParam,
} from "../../utils/yourLibrary/steamUtils";
import { titlesToCandidates } from "../../utils/yourLibrary/importHelpers";

/**
 * Manages the Steam session link state and sync flow.
 *
 * @param {object|null} authUser - Firebase auth user
 * @param {function} onCandidatesReady - Called with { sortedTitles, nextCandidates }
 *   when Steam titles have been fetched and converted to import candidates.
 *   The caller is responsible for updating candidate state and opening the import panel.
 * @param {function} onError - Called with an error message string when the sync fails.
 */
export function useSteamSync({ authUser, onCandidatesReady, onError }) {
  const [steamLinked, setSteamLinked] = useState(null);
  const [steamCheckLoading, setSteamCheckLoading] = useState(false);
  const [steamUnlinking, setSteamUnlinking] = useState(false);
  const [steamTitles, setSteamTitles] = useState([]);

  // Prevents infinite auto-sync loop after the ?steam=linked redirect
  const hasAutoSyncedRef = useRef(false);

  async function refreshSteamLinkedState() {
    try {
      setSteamCheckLoading(true);
      const { linked } = await checkSteamSession();
      setSteamLinked(linked);
      return linked;
    } catch (e) {
      console.warn("Steam session check failed:", e);
      setSteamLinked(false);
      return false;
    } finally {
      setSteamCheckLoading(false);
    }
  }

  useEffect(() => {
    if (!authUser?.uid) {
      setSteamLinked(null);
      return;
    }
    refreshSteamLinkedState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  function handleSteamLogin() {
    if (!authUser?.uid) {
      alert("Please sign in first.");
      return;
    }
    window.location.href = steamAuthUrl(authUser.uid);
  }

  async function handleSteamSync({ allowAutoRelink = true } = {}) {
    try {
      if (!authUser?.uid) {
        alert("Please sign in first.");
        return;
      }

      const { linked: loggedIn, errorMsg: meError } = await checkSteamSession();
      console.log("✅ Steam /api/me:", { loggedIn });
      setSteamLinked(loggedIn);

      if (!loggedIn) {
        if (!allowAutoRelink) {
          onError?.(
            meError ||
              "Not linked to Steam in this browser. Click 'Link Steam' to connect your Steam account.",
          );
          return;
        }
        window.location.href = steamAuthUrl(authUser.uid);
        return;
      }

      let titles;
      try {
        titles = await fetchSteamOwnedGameTitles(authUser.uid);
        console.log("🎮 Steam owned-games fetched:", titles.length);
      } catch (gamesErr) {
        const errMsg = gamesErr?.message || "";
        if (
          allowAutoRelink &&
          errMsg.toLowerCase().includes("not logged in with steam")
        ) {
          window.location.href = steamAuthUrl(authUser.uid);
          return;
        }
        onError?.(errMsg || "Could not fetch Steam library.");
        return;
      }

      setSteamLinked(true);
      setSteamTitles(titles);

      const { sortedTitles, nextCandidates } = titlesToCandidates(
        titles,
        "steam",
      );

      onCandidatesReady?.({ sortedTitles, nextCandidates });
    } catch (err) {
      console.error("🔥 Steam sync error:", err);
      onError?.(err?.message || "Steam sync failed.");
    }
  }

  /* -------------------------------------------------------------------------
    AUTO-RUN STEAM SYNC AFTER REDIRECT (?steam=linked)
  -------------------------------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steamParam = params.get("steam");

    console.log(params);
    console.log(steamParam);

    if (steamParam === "linked" && authUser?.uid && !hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true;
      stripSteamQueryParam();
      setSteamLinked(true);
      handleSteamSync({ allowAutoRelink: false });
    }

    if (steamParam === "fail") {
      stripSteamQueryParam();
      setSteamLinked(false);
      onError?.("Steam login failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);

  return {
    steamLinked,
    setSteamLinked,
    steamCheckLoading,
    steamUnlinking,
    setSteamUnlinking,
    steamTitles,
    setSteamTitles,
    refreshSteamLinkedState,
    handleSteamLogin,
    handleSteamSync,
  };
}
