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

  // Track auth state so the library check re-runs once the user is resolved.
  // Custom games load from Firestore quickly and can beat auth restoration
  // (indexedDB persistence is async), so auth.currentUser may be null on the
  // first pass — this subscription catches that case.
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
        const ref = doc(db, "users", currentUser.uid, "library", docId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setIsInLibrary(data.inLibrary !== false);
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
  }, [gameData, currentUser]);

  return {
    isInLibrary, setIsInLibrary,
    isFavorite, setIsFavorite,
    isCompleted, setIsCompleted,
  };
}
