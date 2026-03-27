// Reads the current user's library, favorite, and completed status for a game
// from Firestore. Re-checks whenever the game data changes.

import { useState, useEffect } from "react";
import { doc, getDoc, db } from "../../firebase/firestore";
import { getLibraryDocId } from "../../utils/gamePage/libraryDocId";

/**
 * @param {object} auth       - Firebase auth instance
 * @param {object|null} gameData - The RAWG game object
 * @returns {{
 *   isInLibrary: boolean, setIsInLibrary: Function,
 *   isFavorite: boolean,  setIsFavorite: Function,
 *   isCompleted: boolean, setIsCompleted: Function,
 * }}
 */
export function useLibraryState(auth, gameData) {
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const checkLibraryState = async () => {
      const user = auth.currentUser;
      const docId = getLibraryDocId(gameData?.id);

      if (!user || !docId) {
        setIsInLibrary(false);
        setIsFavorite(false);
        setIsCompleted(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid, "library", docId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setIsInLibrary(true);
          setIsFavorite(!!data.isFavorite);
          setIsCompleted(data.status === "completed");
        } else {
          setIsInLibrary(false);
          setIsFavorite(false);
          setIsCompleted(false);
        }
      } catch (err) {
        console.error("Error checking library state:", err);
      }
    };

    checkLibraryState();
  }, [gameData]);

  return {
    isInLibrary, setIsInLibrary,
    isFavorite, setIsFavorite,
    isCompleted, setIsCompleted,
  };
}
