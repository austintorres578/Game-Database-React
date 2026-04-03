// Fetches ITAD (IsThereAnyDeal) cover art and store offers for the current game.
// Re-runs whenever the game name changes.

import { useState, useEffect } from "react";
import { dedupeByUrl } from "../../utils/gamePage/storeUtils";

import { BACKEND_BASE } from "../../constants/apiConfig";

/**
 * @param {object|null} gameData - The RAWG game object
 * @returns {{ itadCoverUrl: string|null, itadChecked: boolean, itadStores: object[], itadStoresChecked: boolean }}
 */
export function useItadData(gameData) {
  const [itadCoverUrl, setItadCoverUrl] = useState(null);
  const [itadChecked, setItadChecked] = useState(false);
  const [itadStores, setItadStores] = useState([]);
  const [itadStoresChecked, setItadStoresChecked] = useState(false);

  useEffect(() => {
    if (!gameData?.name) return;
    if (gameData?.isCustom) { setItadChecked(true); setItadStoresChecked(true); return; }

    const fetchItad = async () => {
      try {
        setItadChecked(false);
        setItadCoverUrl(null);
        setItadStoresChecked(false);
        setItadStores([]);

        const lookupUrl =
          `${BACKEND_BASE}/api/itad/lookup?title=` +
          encodeURIComponent(gameData.name) +
          `&t=${Date.now()}`;

        console.log("🟦 ITAD lookup:", lookupUrl);
        const r = await fetch(lookupUrl, { credentials: "include" });
        const data = await r.json().catch(() => ({}));
        console.log("🟩 ITAD lookup result:", data);

        const boxart =
          data?.game?.assets?.boxart ||
          data?.game?.assets?.banner400 ||
          data?.game?.assets?.banner300 ||
          data?.game?.assets?.banner145 ||
          null;

        setItadCoverUrl(data?.found && boxart ? boxart : null);

        if (data?.found && data?.itadId) {
          const storesUrl =
            `${BACKEND_BASE}/api/itad/stores?itadId=` +
            encodeURIComponent(data.itadId) +
            `&country=US&t=${Date.now()}`;

          console.log("🟦 ITAD stores:", storesUrl);
          const r2 = await fetch(storesUrl, { credentials: "include" });
          const data2 = await r2.json().catch(() => ({}));
          console.log("🟩 ITAD stores result:", data2);

          const offers = Array.isArray(data2?.offers) ? data2.offers : [];
          const rawOffers = dedupeByUrl(
            offers
              .map((x) => ({ ...x, url: x?.url || x?.link || x?.href || null }))
              .filter((x) => !!x.url),
          );
          setItadStores(rawOffers);
        } else {
          setItadStores([]);
        }
      } catch (err) {
        console.error("ITAD fetch failed:", err);
        setItadCoverUrl(null);
        setItadStores([]);
      } finally {
        setItadChecked(true);
        setItadStoresChecked(true);
      }
    };

    fetchItad();
  }, [gameData?.name]);

  return { itadCoverUrl, itadChecked, itadStores, itadStoresChecked };
}
