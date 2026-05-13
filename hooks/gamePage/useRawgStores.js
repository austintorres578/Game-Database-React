// Fetches the store links for a game directly from the RAWG API.
// Re-runs whenever the game ID changes.

import { useState, useEffect } from "react";
import {
  inferStoreNameFromUrl,
  normalizeAndSortStores,
} from "../../utils/gamePage/storeUtils";

import { RAWG_KEY } from "../../constants/apiConfig";

/**
 * @param {object|null} gameData - The RAWG game object
 * @returns {{ rawgStores: object[], rawgStoresChecked: boolean }}
 */
export function useRawgStores(gameData) {
  const [rawgStores, setRawgStores] = useState([]);
  const [rawgStoresChecked, setRawgStoresChecked] = useState(false);

  useEffect(() => {
    if (!gameData?.id) return;
    if (gameData?.isCustom) { setRawgStoresChecked(true); return; }

    const fetchRawgStores = async () => {
      try {
        setRawgStoresChecked(false);
        setRawgStores([]);

        const storesUrl =
          `https://api.rawg.io/api/games/${gameData.id}/stores` + RAWG_KEY;

        console.log("🟪 RAWG stores request:", storesUrl);

        const r = await fetch(storesUrl);
        const data = await r.json().catch(() => ({}));
        const results = Array.isArray(data?.results) ? data.results : [];

        const normalized = results
          .map((s) => {
            const url = s?.url || s?.url_en || s?.url_ru || null;
            const rawName = s?.store?.name || "Store";
            const storeName =
              rawName && rawName !== "Store"
                ? rawName
                : inferStoreNameFromUrl(url);
            return { storeName, url };
          })
          .filter((s) => !!s.url);

        const finalList = normalizeAndSortStores(normalized);
        setRawgStores(finalList);
        console.log("🟪 RAWG store links (frontend):", finalList);
      } catch (err) {
        console.error("RAWG stores fetch failed:", err);
        setRawgStores([]);
      } finally {
        setRawgStoresChecked(true);
      }
    };

    fetchRawgStores();
  }, [gameData?.id]);

  return { rawgStores, rawgStoresChecked };
}
