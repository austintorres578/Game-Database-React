// Fetches game details, screenshots, and videos from RAWG on mount.
// Reads the game ID from the URL hash (e.g. /game#12345).

import { useState, useEffect } from "react";

import { RAWG_KEY } from "../../constants/apiConfig";

const RAWG_BASE = "https://api.rawg.io/api/games/";

/**
 * @returns {{ loading: boolean, gameData: object|null, gameScreenshots: object[], gameVideos: object[] }}
 */
export function useGameData() {
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [gameScreenshots, setGameScreenshots] = useState([]);
  const [gameVideos, setGameVideos] = useState([]);

  useEffect(() => {
    const rawId = window.location.href.split("#").pop();
    if (!rawId) return;

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

  return { loading, gameData, gameScreenshots, gameVideos };
}
