// Fetches game details and screenshots from the IGDB backend on mount.
// Reads the game ID from the route param (e.g. /game/12345).
// For custom games (id starts with "custom_"), loads from Firestore instead.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { BACKEND_BASE } from "../../constants/apiConfig";
import { auth } from "../../firebase/fireAuth";
import { doc, getDoc, db } from "../../firebase/firestore";

/**
 * @returns {{ loading: boolean, gameData: object|null, gameScreenshots: object[], gameVideos: object[], isCustomGame: boolean }}
 */
export function useGameData() {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameScreenshots, setGameScreenshots] = useState([]);
  const [gameVideos, setGameVideos] = useState([]);
  const [isCustomGame, setIsCustomGame] = useState(false);
  const [screenshotsLoading, setScreenshotsLoading] = useState(true);

  useEffect(() => {
    const rawId = gameId;
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
            setScreenshotsLoading(false);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Custom game load error:", err);
          setLoading(false);
          setScreenshotsLoading(false);
        });

      return;
    }

    // --- IGDB game: fetch from backend ---
    setLoading(true);
    setScreenshotsLoading(true);

    fetch(`${BACKEND_BASE}/api/igdb/game/${rawId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Game fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const game = data.game;
        if (!game) throw new Error("Game not found");
        setGameData(game);
        setGameScreenshots(game.short_screenshots || []);
        setScreenshotsLoading(false);
        // IGDB has no separate videos endpoint wired yet — set empty for now.
        setGameVideos([]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Game fetch error:", err);
        setLoading(false);
        setScreenshotsLoading(false);
      });
  }, [gameId]);

  return { loading, gameData, gameScreenshots, gameVideos, isCustomGame, screenshotsLoading };
}
