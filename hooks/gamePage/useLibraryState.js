// Reads the current user's library, favorite, and completed status for a game
// from Firestore. Re-checks whenever the game data or auth state changes.

import { useState, useEffect } from "react";
import { doc, getDoc, db } from "../../firebase/firestore";
import { onAuthStateChanged } from "../../firebase/fireAuth";
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
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, [auth]);

  useEffect(() => {
    const checkLibraryState = async () => {
      const docId = getLibraryDocId(gameData?.id);

      if (!currentUser || !docId) {
        setIsInLibrary(false);
        setIsFavorite(false);
        setIsCompleted(false);
        return;
      }

      try {
        const [librarySnap, completedSnap, favoriteSnap] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid, "library", docId)),
          getDoc(doc(db, "users", currentUser.uid, "completed", docId)),
          getDoc(doc(db, "users", currentUser.uid, "favorites", docId)),
        ]);

        setIsInLibrary(librarySnap.exists() && librarySnap.data().inLibrary !== false);
        setIsCompleted(completedSnap.exists());
        setIsFavorite(favoriteSnap.exists());
      } catch (err) {
        console.error("Error checking library state:", err);
      }
    };

    checkLibraryState();
  }, [gameData, currentUser]);

  return {
    isInLibrary, setIsInLibrary,
    isFavorite, setIsFavorite,
    isCompleted, setIsCompleted,
  };
}
