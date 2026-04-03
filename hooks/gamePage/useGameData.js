// Fetches game details, screenshots, and videos from RAWG on mount.
// Reads the game ID from the URL hash (e.g. /game#12345).
// For custom games (hash starts with "custom_"), loads from Firestore instead.

import { useState, useEffect } from "react";

import { RAWG_KEY } from "../../constants/apiConfig";
import { auth } from "../../firebase/fireAuth";
import { doc, getDoc, db } from "../../firebase/firestore";

const RAWG_BASE = "https://api.rawg.io/api/games/";

/**
 * @returns {{ loading: boolean, gameData: object|null, gameScreenshots: object[], gameVideos: object[], isCustomGame: boolean }}
 */
export function useGameData() {
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameScreenshots, setGameScreenshots] = useState([]);
  const [gameVideos, setGameVideos] = useState([]);
  const [isCustomGame, setIsCustomGame] = useState(false);

  useEffect(() => {
    const rawId = window.location.href.split("#").pop();
    if (!rawId) return;

    // --- Custom game: load from Firestore ---
    if (rawId.startsWith("custom_")) {
      setIsCustomGame(true);
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const docRef = doc(db, "users", user.uid, "library", rawId);
      getDoc(docRef)
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setGameData({
              id: rawId,
              name: d.title || "Untitled Game",
              background_image: d.backgroundImage || null,
              description_raw: d.description || "",
              metacritic: d.metacritic ?? null,
              rating: d.rating ?? null,
              released: d.released || null,
              genres: (d.genres || []).map((g) =>
                typeof g === "string" ? { id: g, name: g } : g
              ),
              platforms: (d.platforms || []).map((p) =>
                typeof p === "string" ? { platform: { name: p } } : p
              ),
              tags: (d.tags || []).map((t, i) =>
                typeof t === "string" ? { id: i, name: t, slug: t.toLowerCase().replace(/\s+/g, "-") } : t
              ),
              developers: d.developer ? [{ name: d.developer }] : [],
              publishers: d.publisher ? [{ name: d.publisher }] : [],
              esrb_rating: d.esrbRating ? { name: d.esrbRating } : null,
              slug: rawId,
              isCustom: true,
              addedAt: d.addedAt || null,
            });
            setGameScreenshots(
              (d.screenshots || []).map((s) =>
                typeof s === "string" ? { id: s, image: s } : s
              )
            );
            setGameVideos(d.videos || []);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Custom game load error:", err);
          setLoading(false);
        });

      return;
    }

    // --- RAWG game: fetch from API ---
    const gameUrl = RAWG_BASE + rawId + RAWG_KEY;
    const screenshotsUrl = RAWG_BASE + rawId + "/screenshots" + RAWG_KEY;
    const videosUrl = RAWG_BASE + rawId + "/movies" + RAWG_KEY;

    setLoading(true);

    fetch(gameUrl)
      .then((r) => r.json())
      .then((data) => { console.log("Game data:", data); setGameData(data); setLoading(false); })
      .catch((err) => { console.error("Game data error:", err); setLoading(false); });

    fetch(screenshotsUrl)
      .then((r) => r.json())
      .then((data) => { console.log("Screenshots response:", data); setGameScreenshots(data.results || []); })
      .catch((err) => console.error("Screenshots error:", err));

    fetch(videosUrl)
      .then((r) => r.json())
      .then((data) => {
        console.log("🎥 RAWG video data:", data);
        const results = data.results || [];
        setGameVideos(results);
        if (results.length > 0) console.log("🎥 First video clip info:", results[0]);
        else console.log("No videos found for this game.");
      })
      .catch((err) => console.error("Videos error:", err));
  }, []);

  return { loading, gameData, gameScreenshots, gameVideos, isCustomGame };
}
