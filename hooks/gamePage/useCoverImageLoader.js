// Preloads the hero cover image and tracks whether it has finished loading.
// Keeps the UI from flashing a broken image before the URL is ready.

import { useState, useEffect } from "react";

/**
 * @param {object|null} gameData       - The RAWG game object
 * @param {string}      heroCoverUrl   - The resolved cover URL to preload
 * @param {string}      defaultBackground - Fallback image URL (skips preload)
 * @returns {{ coverLoaded: boolean }}
 */
export function useCoverImageLoader(gameData, heroCoverUrl, defaultBackground) {
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    if (!gameData) {
      setCoverLoaded(false);
      return;
    }

    if (!heroCoverUrl || heroCoverUrl === defaultBackground) {
      setCoverLoaded(true);
      return;
    }

    setCoverLoaded(false);

    const img = new Image();
    img.src = heroCoverUrl;
    img.onload = () => setCoverLoaded(true);
    img.onerror = () => setCoverLoaded(true);
  }, [gameData, heroCoverUrl]);

  return { coverLoaded };
}
